import {
	HttpStatus,
	Injectable,
	NotFoundException,
	UnauthorizedException,
	InternalServerErrorException,
	Logger,
	BadRequestException,
	Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, QueryRunner, In, Not, IsNull } from 'typeorm';
import { User } from '../../entity/user.entity';
import { CreateUserDocDTO } from './dto/user_docs.dto';
import { UserDoc } from '@entities/user_docs.entity';
import { Consent } from '@entities/consent.entity';
import { CreateConsentDto } from './dto/create-consent.dto';
import { UserApplication } from '@entities/user_applications.entity';
import { CreateUserApplicationDto } from './dto/create-user-application-dto';
import { KeycloakService } from '@services/keycloak/keycloak.service';
import { SuccessResponse } from 'src/common/responses/success-response';
import { ErrorResponse } from 'src/common/responses/error-response';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ProfilePopulator from 'src/common/helper/profileUpdate/profile-update';
import { CustomFieldsService } from '@modules/customfields/customfields.service';
import { AdminService } from '@modules/admin/admin.service';
import axios from 'axios';
import { FieldContext } from '@modules/customfields/entities/field.entity';
import { ConfigService } from '@nestjs/config';
import { ProxyService } from '@services/proxy/proxy.service';
import { v4 as uuidv4 } from 'uuid';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { IFileStorageService } from '@services/storage-providers/file-storage.service.interface';
import { DocumentUploadService } from '@modules/document-upload/document-upload.service';
import { OcrService } from '@services/ocr/ocr.service';
import { OcrMappingService } from '@services/ocr-mapping/ocr-mapping.service';
import { VcFieldsService, VcFields } from '../../common/helper/vcFieldService';
import { VcAdapterFactory } from '@services/vc-adapters/vc-adapter.factory';

type StatusUpdateInfo = {
	attempted: boolean;
	success: boolean;
	processedCount: number;
	error: string | null;
	skipped?: boolean;
	skipReason?: string | null;
};
@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(UserDoc)
		private readonly userDocsRepository: Repository<UserDoc>,
		@InjectRepository(Consent)
		private readonly consentRepository: Repository<Consent>,
		@InjectRepository(UserApplication)
		private readonly userApplicationRepository: Repository<UserApplication>,
		private readonly keycloakService: KeycloakService,
		private readonly profilePopulator: ProfilePopulator,
		private readonly customFieldsService: CustomFieldsService,
		private readonly configService: ConfigService,
		private readonly proxyService: ProxyService,
		private readonly adminService: AdminService,
		@Inject('FileStorageService')
		private readonly fileStorageService: IFileStorageService,
		private readonly documentUploadService: DocumentUploadService,
		private readonly ocrService: OcrService,
		private readonly ocrMappingService: OcrMappingService,
		private readonly vcFieldsService: VcFieldsService,
		private readonly vcAdapterFactory: VcAdapterFactory,
	) {}

	/*  async create(createUserDto: CreateUserDto) {
	   const user = this.userRepository.create(createUserDto);
	   try {
		 const savedUser = await this.userRepository.save(user);
   
		 return new SuccessResponse({
		   statusCode: HttpStatus.OK, // Created
		   message: 'User created successfully.',
		   data: savedUser,
		 });
	   } catch (error) {
		 return new ErrorResponse({
		   statusCode: HttpStatus.INTERNAL_SERVER_ERROR, // Created
		   errorMessage: error.message,
		 });
	   }
	 } */

	async update(userId: string, updateUserDto: any) {
		// Destructure userInfo from the payload
		const { userInfo, ...userData } = updateUserDto;

		// Check for existing user in the user table
		const existingUser = await this.userRepository.findOne({
			where: { user_id: userId },
		});

		if (!existingUser) {
			return new ErrorResponse({
				statusCode: HttpStatus.NOT_FOUND,
				errorMessage: `User with ID '${userId}' not found`,
			});
		}

		// Update the user information in userRepository
		Object.assign(existingUser, userData);

		try {
			const updatedUser: User = await this.userRepository.save(existingUser);

			const existingUserInfo = await this.customFieldsService.saveCustomFields(
				updatedUser.user_id,
				FieldContext.USERS,
				userInfo,
			);

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'User and associated info updated successfully',
				data: {
					...updatedUser,
					userInfo: userInfo ?? existingUserInfo, // Combine updated user with userInfo
				},
			});
		} catch (error) {
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: error.message ?? 'An error occurred while updating user',
			});
		}
	}

	async findOne(req: any, decryptData?: boolean) {
		try {
			const sso_id = req?.user?.keycloak_id;
			if (!sso_id) {
				return new ErrorResponse({
					statusCode: HttpStatus.UNAUTHORIZED,
					errorMessage: 'Invalid or missing Keycloak ID',
				});
			}

			const userDetails = await this.userRepository.findOne({
				where: { sso_id },
			});

			if (!userDetails) {
				return new ErrorResponse({
					statusCode: HttpStatus.NOT_FOUND,
					errorMessage: `User with ID '${sso_id}' not found`,
				});
			}

			const user = await this.findOneUser(userDetails.user_id);
			const customFields = await this.customFieldsService.getCustomFields(
				userDetails.user_id,
				FieldContext.USERS,
			);
			const userDoc = await this.findUserDocs(userDetails.user_id, decryptData);

			const final = {
				...user,
				docs: userDoc || [],
				customFields: customFields || [],
			};
			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'User retrieved successfully.',
				data: final,
			});
		} catch (error) {
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: error.message,
			});
		}
	}

	async findConsentByUser(req: any) {
		try {
			const sso_id = req?.user?.keycloak_id;
			if (!sso_id) {
				return new ErrorResponse({
					statusCode: HttpStatus.UNAUTHORIZED,
					errorMessage: 'Invalid or missing Keycloak ID',
				});
			}

			const userDetails = await this.userRepository.findOne({
				where: { sso_id },
			});

			if (!userDetails) {
				return new ErrorResponse({
					statusCode: HttpStatus.NOT_FOUND,
					errorMessage: `User with ID '${sso_id}' not found`,
				});
			}

			const consent = await this.findUserConsent(userDetails.user_id);

			const final = {
				...consent,
			};
			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'User consent retrieved successfully.',
				data: final,
			});
		} catch (error) {
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: error.message,
			});
		}
	}

	async findOneUser(user_id: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { user_id },
		});

		return user;
	}

	async findUserDocs(user_id: string, decryptData: boolean) {
		const userDocs = await this.userDocsRepository.find({ where: { user_id } });

		// Retrieve supported document subtypes from settings (vcConfiguration)
		let docTypes = [];
		try {
			const vcConfig =
				await this.adminService.getConfigByKey('vcConfiguration');
			docTypes = Array.isArray(vcConfig?.value) ? vcConfig.value : [];
		} catch (error) {
			Logger.error('Failed to fetch vcConfiguration:', error);
			docTypes = [];
		}

		// Generate pre-signed URLs for documents if using S3
		const docsWithUrls = await Promise.all(
			userDocs.map(async (doc) => {
				const downloadUrl =
					await this.documentUploadService.generateDownloadUrl(doc.doc_path);
				return {
					...doc,
					is_uploaded: docTypes.some(
						(obj) => obj.documentSubType === doc.doc_subtype,
					),
					download_url: downloadUrl,
				};
			}),
		);

		return docsWithUrls;
	}

	async findUserConsent(user_id: string): Promise<any> {
		const consents = await this.consentRepository.find({
			where: { user_id },
		});

		// Format the response
		return {
			statusCode: 200,
			message: 'User consent retrieved successfully.',
			data: consents.map((consent) => ({
				id: consent.id,
				user_id: consent.user_id,
				purpose: consent.purpose,
				purpose_text: consent.purpose_text,
				accepted: consent.accepted,
				consent_date: consent.consent_date,
			})),
		};
	}

	// Method to check if mobile number exists
	async findByMobile(mobile: string): Promise<User | undefined> {
		return await this.userRepository.findOne({
			where: { phoneNumber: mobile },
		});
	}

	async findBySsoId(ssoId: string): Promise<User | undefined> {
		return await this.userRepository.findOne({
			where: { sso_id: ssoId },
		});
	}

	async createKeycloakData(body: any): Promise<User> {
		const user = this.userRepository.create({
			firstName: body.firstName,
			lastName: body.lastName,
			email: body.email ?? '',
			phoneNumber: body.phoneNumber ?? '',
			sso_provider: 'keycloak',
			sso_id: body.keycloak_id,
			walletToken: body.walletToken ?? null,
			created_at: new Date(),
		});
		return await this.userRepository.save(user);
	}
	private preprocessDocData(doc_data: any): any {
		if (typeof doc_data === 'object') {
			try {
				return JSON.stringify(doc_data);
			} catch (error) {
				Logger.error('Error stringifying doc_data:', error);
				throw new BadRequestException(
					'Invalid doc_data format: Unable to stringify JSON',
				);
			}
		}
		return doc_data;
	}

	// User docs save
	/*   async createUserDoc(createUserDocDto: CreateUserDocDTO) {
		try {
		  // Stringify the JSON doc_data before encryption
		  const stringifiedDocData = this.preprocessDocData(createUserDocDto.doc_data);
	
		  const newUserDoc = this.userDocsRepository.create({
			...createUserDocDto,
			doc_data: stringifiedDocData,
		  });
	
		  const savedUserDoc = await this.userDocsRepository.save(newUserDoc);
		  return new SuccessResponse({
			statusCode: HttpStatus.OK,
			message: 'User docs added to DB successfully.',
			data: savedUserDoc,
		  });
		} catch (error) {
		  if (error.code == '23505') {
			return new ErrorResponse({
			  statusCode: HttpStatus.BAD_REQUEST,
			  errorMessage: error.detail,
			});
		  }
		  return new ErrorResponse({
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			errorMessage: error,
		  });
		}
	  } */

	async getDoc(createUserDocDto: CreateUserDocDTO) {
		const existingDoc = await this.userDocsRepository.findOne({
			where: {
				user_id: createUserDocDto.user_id,
				doc_type: createUserDocDto.doc_type,
				doc_subtype: createUserDocDto.doc_subtype,
			},
		});

		return existingDoc;
	}

	async saveDoc(createUserDocDto: CreateUserDocDTO) {
		// Stringify the JSON doc_data before saving (encryption happens via entity transformer)
		const stringifiedDocData = this.preprocessDocData(
			createUserDocDto.doc_data,
		);

		const newUserDoc = this.userDocsRepository.create({
			...createUserDocDto,
			doc_data: stringifiedDocData,
		});

		// Save to the database
		const savedDoc = await this.userDocsRepository.save(newUserDoc);
		return savedDoc;
	}

	async writeToFile(
		createUserDocDto: CreateUserDocDTO,
		userFilePath: any,
		savedDoc: any,
	) {
		try {
			// Initialize the file with empty array if it doesn't exist
			let currentData = [];
			if (fs.existsSync(userFilePath)) {
				try {
					currentData = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
				} catch (err) {
					console.error('Error reading/parsing file, reinitializing:', err);
				}
			}

			currentData.push(savedDoc);

			// Write the updated data to the file
			fs.writeFileSync(userFilePath, JSON.stringify(currentData, null, 2));
			console.log(
				`File written successfully for user_id: ${createUserDocDto.user_id}`,
			);
		} catch (err) {
			console.error('Error writing to file:', err);
		}
	}

	async getSavedAndExistingDocs(
		createUserDocsDto: CreateUserDocDTO[],
		baseFolder: any,
	) {
		const savedDocs: UserDoc[] = [];
		const existingDocs: UserDoc[] = [];

		for (const createUserDocDto of createUserDocsDto) {
			const userFilePath = path.join(
				baseFolder,
				`${createUserDocDto.user_id}.json`,
			);

			// Check if a record with the same user_id, doc_type, and doc_subtype exists in DB
			const existingDoc = await this.getDoc(createUserDocDto);

			if (existingDoc) {
				existingDocs.push(existingDoc);
				console.log(
					`Document already exists for user_id: ${createUserDocDto.user_id}, doc_type: ${createUserDocDto.doc_type}, doc_subtype: ${createUserDocDto.doc_subtype}`,
				);
			} else {
				// Create the new document entity for the database
				const savedDoc = await this.saveDoc(createUserDocDto);
				savedDocs.push(savedDoc);
				await this.writeToFile(createUserDocDto, userFilePath, savedDoc);
			}
		}

		return { savedDocs, existingDocs };
	}

	async createUserDocs(
		createUserDocsDto: CreateUserDocDTO[],
	): Promise<UserDoc[]> {
		const baseFolder = path.join(__dirname, 'userData'); // Base folder for storing user files

		// Ensure the `userData` folder exists
		if (!fs.existsSync(baseFolder)) {
			fs.mkdirSync(baseFolder, { recursive: true });
		}

		const { savedDocs, existingDocs } = await this.getSavedAndExistingDocs(
			createUserDocsDto,
			baseFolder,
		);

		if (existingDocs.length > 0) return existingDocs;

		return savedDocs;
	}

	async getUserDetails(req: any): Promise<User> {
		const sso_id = req?.user?.keycloak_id;
		if (!sso_id) {
			throw new UnauthorizedException('Invalid or missing Keycloak ID');
		}

		const userDetails = await this.userRepository.findOne({
			where: { sso_id },
		});

		if (!userDetails) {
			throw new NotFoundException(`User with ID '${sso_id}' not found`);
		}

		return userDetails;
	}

	async updateProfile(userDetails: User) {
		try {
			// Get all docs
			const allDocs = await this.userDocsRepository.find({
				where: { user_id: userDetails.user_id },
			});

			// Build VCs
			const VCs: any[] = await this.profilePopulator.buildVCs(allDocs);

			// // build profile data
			const { userProfile, validationData } =
				await this.profilePopulator.buildProfile(VCs);

			const adminResultData =
				await this.keycloakService.getAdminKeycloakToken();

			// Update database entries
			await this.profilePopulator.updateDatabase(
				userProfile,
				validationData,
				userDetails,
				adminResultData,
			);
		} catch (error) {
			Logger.error('Error in updating fields: ', error);
			throw new InternalServerErrorException(
				'An unexpected error occurred while updating profile.',
			);
		}
	}

	async deleteDoc(doc: UserDoc) {
		const queryRunner =
			this.userDocsRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		try {
			await queryRunner.startTransaction();
			await queryRunner.manager.remove(doc);
			await queryRunner.commitTransaction();
		} catch (error) {
			Logger.error('Error while deleting the document: ', error);
			await queryRunner.rollbackTransaction();
			throw new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: `Error while deleting the document: ${error}`,
			});
		} finally {
			await queryRunner.release();
		}
	}

	async createUserDocsNew(
		req,
		createUserDocsDto: CreateUserDocDTO[],
	): Promise<UserDoc[]> {
		const userDetails = await this.getUserDetails(req);
		const baseFolder = path.join(__dirname, 'userData'); // Base folder for storing user files
		const savedDocs: UserDoc[] = [];

		// Ensure the `userData` folder exists
		if (!fs.existsSync(baseFolder)) {
			fs.mkdirSync(baseFolder, { recursive: true });
		}

		for (const createUserDocDto of createUserDocsDto) {
			try {
				const savedDoc = await this.processSingleUserDoc(
					createUserDocDto,
					userDetails,
					baseFolder,
				);

				if (savedDoc) {
					savedDocs.push(savedDoc);
				}
			} catch (error) {
				Logger.error('Error processing document:', error);
				throw error;
			}
		}

		// Update profile based on documents
		try {
			await this.updateProfile(userDetails);
		} catch (error) {
			Logger.error('Profile update failed:', error);
		}

		return savedDocs;
	}

	private async processSingleUserDoc(
		createUserDocDto: CreateUserDocDTO,
		userDetails: any,
		baseFolder: string,
	): Promise<UserDoc | null> {
		// Call the verification method before further processing
		let verificationResult;
		try {
			// Extract issuer from doc_data if available, otherwise use undefined (will fallback to default)
			const issuer = (createUserDocDto as any).issuer || undefined;
			verificationResult = await this.verifyVcWithApi(
				createUserDocDto.doc_data,
				issuer,
			);
		} catch (error) {
			// Extract a user-friendly message
			let message =
				error?.response?.data?.message ??
				error?.message ??
				'VC Verification failed';
			throw new BadRequestException({
				message: message,
				error: 'Bad Request',
				statusCode: 400,
			});
		}

		if (!verificationResult.success) {
			throw new BadRequestException({
				message: verificationResult.message ?? 'VC Verification failed',
				errors: verificationResult.errors ?? [],
				statusCode: 400,
				error: 'Bad Request',
			});
		}

		const userFilePath = path.join(
			baseFolder,
			`${createUserDocDto.user_id}.json`,
		);

		// Check if a record with the same user_id, doc_type, and doc_subtype exists in DB
		const existingDoc = await this.userDocsRepository.findOne({
			where: {
				user_id: userDetails.user_id,
				doc_type: createUserDocDto.doc_type,
				doc_subtype: createUserDocDto.doc_subtype,
			},
		});

		if (existingDoc) await this.deleteDoc(existingDoc);

		if (!createUserDocDto?.user_id) {
			createUserDocDto.user_id = userDetails?.user_id;
		}

		// Create the new document entity for the database
		try {
			const savedDoc = await this.saveDoc(createUserDocDto);
			await this.writeToFile(createUserDocDto, userFilePath, savedDoc);

			// Register watcher if imported_from is e-wallet or QR Code
			await this.handleWatcherRegistrationIfNeeded(
				createUserDocDto,
				savedDoc,
				userDetails,
			);

			return savedDoc;
		} catch (error) {
			Logger.error('Error processing document:', error);
			return null;
		}
	}

	// Create a new consent record
	async createUserConsent(
		createConsentDto: CreateConsentDto,
	): Promise<Consent> {
		const consent = this.consentRepository.create(createConsentDto);
		return await this.consentRepository.save(consent);
	}
	async createUserApplication(
		createUserApplicationDto: CreateUserApplicationDto,
	) {
		try {
			// Check if an application already exists for the given benefit_id and user_id
			const existingApplication = await this.userApplicationRepository.findOne({
				where: {
					benefit_id: createUserApplicationDto.benefit_id,
					user_id: createUserApplicationDto.user_id,
				},
			});

			if (existingApplication) {
				// Update the existing application with new values from the DTO
				Object.assign(existingApplication, createUserApplicationDto);
				const updated =
					await this.userApplicationRepository.save(existingApplication);
				return new SuccessResponse({
					statusCode: HttpStatus.OK,
					message: 'User application resubmitted successfully.',
					data: updated,
				});
			} else {
				// Create a new application
				const userApplication = this.userApplicationRepository.create(
					createUserApplicationDto,
				);
				const response =
					await this.userApplicationRepository.save(userApplication);
				return new SuccessResponse({
					statusCode: HttpStatus.OK,
					message: 'User application submitted successfully.',
					data: response,
				});
			}
		} catch (error) {
			console.error('Error while creating/updating user application:', error);
			throw new InternalServerErrorException(
				'Failed to create or update user application',
			);
		}
	}

	async findOneUserApplication(internal_application_id: string) {
		const userApplication = await this.userApplicationRepository.findOne({
			where: { internal_application_id },
		});
		if (!userApplication) {
			throw new NotFoundException(
				`Application with ID '${internal_application_id}' not found`,
			);
		}
		return new SuccessResponse({
			statusCode: HttpStatus.OK,
			message: 'User application retrieved successfully.',
			data: userApplication,
		});
	}

	async findAllApplicationsByUserId(requestBody: {
		filters?: any;
		search?: string;
		page?: number;
		limit?: number;
	}) {
		const { filters = {}, search, page = 1, limit = 10 } = requestBody;

		let statusUpdateInfo: StatusUpdateInfo;
		if (filters.benefit_id) {
			// skipped due to benefit_id filter
			statusUpdateInfo = {
				attempted: false,
				success: true,
				processedCount: 0,
				error: null,
				skipped: true,
				skipReason: 'Skipped status update due to benefit_id filter',
			};
		} else {
			statusUpdateInfo = await this.performStatusUpdate(filters.user_id);
		}

		// Now fetch the applications list with updated statuses
		try {
			const whereClause = this.buildWhereClause(filters, search);
			const [userApplication, total] =
				await this.userApplicationRepository.findAndCount({
					where: whereClause,
					skip: (page - 1) * limit,
					take: limit,
				});

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'User applications list retrieved successfully.',
				data: {
					applications: userApplication,
					total,
					statusUpdate: statusUpdateInfo,
				},
			});
		} catch (error) {
			console.error('Error while fetching user applications:', error);
			throw new InternalServerErrorException(
				'Failed to fetch user applications',
			);
		}
	}

	private async performStatusUpdate(userId?: string) {
		const statusUpdateInfo = {
			attempted: false,
			success: false,
			processedCount: 0,
			error: null,
		};

		try {
			statusUpdateInfo.attempted = true;
			const applicationsForUpdate = await this.getApplications(userId);

			if (applicationsForUpdate.length > 0) {
				await this.processApplications(applicationsForUpdate);
				statusUpdateInfo.success = true;
				statusUpdateInfo.processedCount = applicationsForUpdate.length;
				Logger.log(
					`Status update completed for ${applicationsForUpdate.length} applications'}`,
				);
			} else {
				statusUpdateInfo.success = true;
				Logger.log(`No applications found requiring status updates`);
			}
		} catch (statusUpdateError) {
			statusUpdateInfo.error = statusUpdateError.message;
			Logger.error(
				`Status update failed during user applications list retrieval: ${statusUpdateError.message}`,
				statusUpdateError.stack,
			);
		}

		return statusUpdateInfo;
	}

	private buildWhereClause(filters: any, search?: string) {
		const whereClause = {};
		const filterKeys = this.userApplicationRepository.metadata.columns.map(
			(column) => column.propertyName,
		);

		// Handle filters
		if (filters && Object.keys(filters).length > 0) {
			this.applyFilters(whereClause, filters, filterKeys);
		}

		// Handle search for `application_name`
		if (search && search.trim().length > 0) {
			const sanitizedSearch = search.replace(/[%_]/g, '\\$&');
			whereClause['application_name'] = ILike(`%${sanitizedSearch}%`);
		}

		return whereClause;
	}

	private applyFilters(whereClause: any, filters: any, filterKeys: string[]) {
		for (const [key, value] of Object.entries(filters)) {
			if (filterKeys.includes(key) && value !== null && value !== undefined) {
				whereClause[key] = value;
			}
		}
	}

	public async registerUserWithUsername(body) {
		// Replace spaces with underscores in first name and last name
		const firstPartOfFirstName = body?.firstName
			?.split(' ')[0]
			?.replace(/\s+/g, '_');
		const lastNameWithUnderscore = body?.lastName?.replace(/\s+/g, '_');

		// Extract the last 2 digits of Aadhar
		const lastTwoDigits = body?.aadhaar?.slice(-2);

		// Concatenate the processed first name, last name, and last 2 digits of Aadhar
		const username =
			firstPartOfFirstName?.toLowerCase() +
			'_' +
			lastNameWithUnderscore?.toLowerCase() +
			lastTwoDigits;

		const data_to_create_user = {
			enabled: 'true',
			firstName: body?.firstName,
			lastName: body?.lastName,
			username: username,
			credentials: [
				{
					type: 'password',
					value: body?.password,
					temporary: false,
				},
			],
		};

		// Step 3: Get Keycloak admin token
		const token = await this.keycloakService.getAdminKeycloakToken();

		try {
			// Step 4: Register user in Keycloak
			const registerUserRes = await this.keycloakService.registerUser(
				data_to_create_user,
				token.access_token,
			);

			if (registerUserRes.error) {
				if (
					registerUserRes.error.message == 'Request failed with status code 409'
				) {
					console.log('User already exists!');
				} else {
					console.log(registerUserRes.error.message);
				}
			} else if (registerUserRes.headers.location) {
				const split = registerUserRes.headers.location.split('/');
				const keycloak_id = split[split.length - 1];
				body.keycloak_id = keycloak_id;
				body.username = data_to_create_user.username;

				// Step 5: Try to create user in PostgreSQL
				const result = await this.createKeycloakData(body);

				// If successful, return success response
				const userResponse = {
					user: result,
					keycloak_id: keycloak_id,
					username: data_to_create_user.username,
				};
				return userResponse;
			} else {
				console.log('Unable to create user in Keycloak');
			}
		} catch (error) {
			console.error('Error during user registration:', error);

			// Step 6: Rollback - delete user from Keycloak if PostgreSQL insertion fails
			if (body?.keycloak_id) {
				await this.keycloakService.deleteUser(body.keycloak_id);
				console.log(
					'Keycloak user deleted due to failure in PostgreSQL creation',
				);
			}
		}
	}

	async resetInUsers(
		field: string,
		existingDoc: UserDoc,
		queryRunner: QueryRunner,
	) {
		await queryRunner.manager
			.getRepository(User)
			.createQueryBuilder()
			.update(User)
			.set({ [field]: () => 'NULL' }) // Use a raw SQL expression for setting NULL.
			.where('user_id = :id', { id: existingDoc.user_id })
			.execute();
	}

	async resetFields(field: string, existingDoc: UserDoc) {
		try {
			const fieldData = await this.customFieldsService.getFieldByName(
				field,
				FieldContext.USERS,
			);

			if (!fieldData?.fieldId) {
				Logger.warn(`Field '${field}' not found in custom fields`);
				return;
			}

			await this.customFieldsService.setFieldValueToNull(
				existingDoc.user_id,
				fieldData.fieldId,
			);
		} catch (error) {
			Logger.error(
				`Error resetting field '${field}' for user ${existingDoc.user_id}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Get fields to reset from database configuration based on document type
	 * @param docSubtype Document subtype (e.g., 'casteCertificate', 'disabilityCertificate')
	 * @returns Array of field names to reset
	 */
	private async getFieldsToResetFromConfig(
		docSubtype: string,
	): Promise<string[]> {
		try {
			// Get profile fields configuration from settings table
			const configResponse = await this.adminService.getConfigByKey(
				'profileFieldToDocumentFieldMapping',
			);

			if (!configResponse?.value) {
				Logger.warn(
					'profileFieldToDocumentFieldMapping configuration not found',
				);
				return [];
			}

			const profileFields = Array.isArray(configResponse.value)
				? configResponse.value
				: [];
			const fieldsToReset: string[] = [];

			// Find all fields that have mappings to this document type
			for (const fieldConfig of profileFields) {
				const documentMappings = fieldConfig.documentMappings || [];

				// Check if this field has a mapping for the given document type
				const hasMapping = documentMappings.some(
					(mapping: any) => mapping.document === docSubtype,
				);

				if (hasMapping && fieldConfig.fieldName) {
					fieldsToReset.push(fieldConfig.fieldName);
				}
			}

			Logger.debug(
				`Fields to reset for document type '${docSubtype}': [${fieldsToReset.join(', ')}]`,
			);
			return fieldsToReset;
		} catch (error) {
			Logger.error(
				`Error getting fields to reset for document type '${docSubtype}':`,
				error,
			);
			return [];
		}
	}

	async resetField(existingDoc: UserDoc, queryRunner: QueryRunner) {
		try {
			// Get fields to reset from database configuration instead of hardcoded array
			const fields = await this.getFieldsToResetFromConfig(
				existingDoc.doc_subtype,
			);

			if (fields.length === 0) {
				Logger.warn(
					`No field mappings found for document type '${existingDoc.doc_subtype}'`,
				);
				return;
			}

			for (const field of fields) {
				try {
					if (field === 'middleName') {
						// Special handling for middleName field (updates users table directly)
						await this.resetInUsers(field, existingDoc, queryRunner);
					} else {
						// Reset custom field values
						await this.resetFields(field, existingDoc);
					}
				} catch (error) {
					Logger.error(
						`Error resetting field '${field}' for user ${existingDoc.user_id}:`,
						error,
					);
					// Continue with other fields even if one fails
				}
			}
		} catch (error) {
			Logger.error(
				`Error in resetField for document ${existingDoc.doc_id}:`,
				error,
			);
			throw error;
		}
	}

	private async handleWatcherRegistrationIfNeeded(
		createUserDocDto: CreateUserDocDTO,
		savedDoc: UserDoc,
		userDetails: any,
	): Promise<void> {
		const importSource = createUserDocDto.imported_from?.trim().toLowerCase();
		if (
			!importSource ||
			(importSource !== 'e-wallet' && importSource !== 'qr code')
		) {
			return;
		}

		// Validate doc_data_link exists
		if (!createUserDocDto.doc_data_link) {
			Logger.warn(
				`No doc_data_link for watcher registration: ${savedDoc.doc_id}`,
			);
			return;
		}

		// Use provided email and callback URL or defaults
		const email = process.env.DHIWAY_WATCHER_EMAIL;
		if (!email) {
			Logger.warn(
				`No watcher email configured, skipping registration for: ${savedDoc.doc_id}`,
			);
			return;
		}

		const callbackUrl =
			createUserDocDto.watcher_callback_url ||
			`${process.env.BASE_URL || 'http://localhost:3000'}/users/wallet-callback`;

		try {
			const watcherResult = await this.registerWatcher(
				createUserDocDto.imported_from,
				createUserDocDto.doc_data,
				createUserDocDto.doc_data_link,
				email,
				callbackUrl,
				userDetails,
			);

			if (watcherResult.success) {
				// Update the saved document with watcher information
				savedDoc.watcher_registered = true;
				savedDoc.watcher_email = email;
				savedDoc.watcher_callback_url = callbackUrl;

				// Save the updated document
				await this.userDocsRepository.save(savedDoc);

				Logger.log(
					`Watcher registered successfully for document: ${savedDoc.doc_id}`,
				);
			} else {
				Logger.warn(
					`Watcher registration failed for document: ${savedDoc.doc_id}, Error: ${watcherResult.message}`,
				);
			}
		} catch (watcherError) {
			Logger.error(
				`Error during watcher registration for document: ${savedDoc.doc_id}`,
				watcherError,
			);
		}
	}

	async delete(req: any, doc_id: string) {
		const IsValidUser = req?.user;
		if (!IsValidUser) {
			throw new UnauthorizedException('User is not authenticated');
		}
		const sso_id = IsValidUser.keycloak_id;

		// Get user_id of logged in user
		const user = await this.userRepository.findOne({
			where: { sso_id: sso_id },
		});

		if (!user)
			return new ErrorResponse({
				statusCode: HttpStatus.NOT_FOUND,
				errorMessage: 'User with given sso_id not found',
			});

		const user_id = user.user_id;

		// Check if document exists or not, if not then send erorr response
		const existingDoc = await this.userDocsRepository.findOne({
			where: {
				doc_id: doc_id,
			},
		});

		if (!existingDoc) {
			Logger.error(`Document with id ${doc_id} does not exists`);
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: `Document with id ${doc_id} does not exists`,
			});
		}

		// Check if logged in user is allowed to delete this document or not
		if (existingDoc.user_id !== user_id)
			return new ErrorResponse({
				statusCode: HttpStatus.UNAUTHORIZED,
				errorMessage:
					'You are not authorized to modify or delete this resourse',
			});

		// Store the file path before deleting from database
		const filePath = existingDoc.doc_path;

		// Delete the document
		const queryRunner =
			this.userDocsRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		try {
			await queryRunner.startTransaction();
			await queryRunner.manager.remove(existingDoc);
			// Reset the field along with deleting the document
			await this.resetField(existingDoc, queryRunner);
			await queryRunner.commitTransaction();

			// Delete the physical file using document upload service
			if (filePath) {
				try {
					await this.documentUploadService.deleteFile(filePath);
				} catch (fileError) {
					Logger.error(`Failed to delete file from storage: ${fileError}`);
					// Don't fail the entire operation if file deletion fails
				}
			}
		} catch (error) {
			Logger.error('Error while deleting the document: ', error);
			await queryRunner.rollbackTransaction();
			await queryRunner.release();
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: `Error while deleting the document: ${error}`,
			});
		} finally {
			await queryRunner.release();
		}

		return new SuccessResponse({
			statusCode: HttpStatus.OK,
			message: 'Document deleted successfully',
		});
	}

	/**
	 * Private helper method to fetch and validate VC JSON from a URL
	 * @param url The VC URL to fetch data from
	 * @returns Promise containing validated VC data or error
	 */
	private async fetchAndValidateVcJson(url: string): Promise<any> {
		try {
			// Validate URL scheme to prevent SSRF attacks
			const parsed = new URL(url);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				return { error: true, message: 'Invalid VC URL scheme', status: 400 };
			}

			// Fetch the VC JSON with proper headers
			const vcResponse = await axios.get(url, {
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				timeout: 8000,
			});

			// Validate that we received JSON data
			let vcData;
			try {
				if (typeof vcResponse.data === 'string') {
					vcData = JSON.parse(vcResponse.data);
				} else {
					vcData = vcResponse.data;
				}
			} catch (_parseError) {
				Logger.error('Invalid JSON response from VC endpoint', _parseError);
				return {
					error: true,
					message: 'Invalid JSON response from VC endpoint',
					status: 422,
				};
			}

			// Basic validation that it looks like a VC
			if (!vcData || typeof vcData !== 'object') {
				return {
					error: true,
					message: 'Invalid VC data structure received',
					status: 422,
				};
			}

			// Return in format expected by frontend
			return {
				data: {
					vcData: vcData,
					url: url,
				},
			};
		} catch (error) {
			// Handle errors and return a meaningful message
			if (axios.isAxiosError(error)) {
				const msg =
					typeof error.response?.data === 'string'
						? error.response.data
						: error.message;
				return {
					error: true,
					message: msg,
					status: error.response?.status ?? 500,
				};
			}
			return {
				error: true,
				message: 'Unknown error occurred while fetching VC data',
				status: 500,
			};
		}
	}

	/**
	 * Fetches a Verifiable Credential JSON from a URL that already ends with .vc
	 * Used for wallet callbacks and direct VC URLs
	 * @param vcUrl The direct VC URL (already ending with .vc)
	 * @returns Object containing vcData and vcUrl in format expected by frontend
	 */
	async fetchVcJsonFromVcUrl(vcUrl: string): Promise<any> {
		return this.fetchAndValidateVcJson(vcUrl);
	}

	/**
	 * Fetches a Verifiable Credential JSON from a given URL.
	 * Handles both dway.io and haqdarshak.com style URLs.
	 * Follows redirects and appends .vc if needed.
	 * @param url The URL from the QR code
	 * @returns Object containing vcData and vcUrl in format expected by frontend
	 */
	async fetchVcJsonFromUrl(url: string): Promise<any> {
		try {
			// Basic scheme validation before the first network call
			const initialParsed = new URL(url);
			if (
				initialParsed.protocol !== 'http:' &&
				initialParsed.protocol !== 'https:'
			) {
				return { error: true, message: 'Invalid URL scheme', status: 400 };
			}

			// 1. Follow redirects to get the final URL (without downloading the VC yet)
			const response = await axios.get(url, {
				maxRedirects: 5,
				timeout: 8000,
				validateStatus: (status) => status >= 200 && status < 400, // allow redirects
			});
			// Try multiple known locations for the resolved URL (follow-redirects runtime)
			let finalUrl = url;
			if (response.request?.res?.responseUrl) {
				finalUrl = response.request.res.responseUrl;
			} else if (response.request?._redirectable?._currentUrl) {
				finalUrl = response.request._redirectable._currentUrl;
			}

			// 2. Append/normalize to .vc while preserving query and hash
			const parsedFinal = new URL(finalUrl);
			if (!parsedFinal.pathname.endsWith('.vc')) {
				if (parsedFinal.pathname.endsWith('.json')) {
					parsedFinal.pathname = parsedFinal.pathname.replace(/\.json$/, '.vc');
				} else {
					parsedFinal.pathname =
						parsedFinal.pathname.replace(/\/$/, '') + '.vc';
				}
			}
			finalUrl = parsedFinal.toString();

			// 3. Use the common method to fetch and validate VC data
			return this.fetchAndValidateVcJson(finalUrl);
		} catch (error) {
			// Handle errors and return a meaningful message
			if (axios.isAxiosError(error)) {
				const msg =
					typeof error.response?.data === 'string'
						? error.response.data
						: error.message;
				return {
					error: true,
					message: msg,
					status: error.response?.status ?? 500,
				};
			}
			return {
				error: true,
				message: 'Unknown error occurred',
				status: 500,
			};
		}
	}

	private async verifyVcWithApi(
		vcData: any,
		issuer?: string,
	): Promise<{ success: boolean; message?: string; errors?: any[] }> {
		try {
			// Try to extract issuer from VC data if not provided
			// VC data may have issuer as a string (DID) or object with id property

			const issuerName =
				issuer || process.env.VC_DEFAULT_ISSUER_NAME || 'dhiway';

			const verificationPayload = {
				credential: vcData,
				config: {
					method: 'online',
					issuerName: issuerName,
				},
			};

			const verificationUrl = process.env.VC_VERIFICATION_SERVICE_URL;
			if (!verificationUrl) {
				return {
					success: false,
					message: 'VC_VERIFICATION_SERVICE_URL env variable not set',
					errors: [],
				};
			}

			const response = await axios.post(
				`${verificationUrl}/verification`,
				verificationPayload,
				{
					headers: { 'Content-Type': 'application/json' },
					timeout: 8000,
				},
			);

			// Use the API's response format directly
			return {
				success: response.data?.success,
				message: response.data?.message,
				errors: response.data?.errors,
			};
		} catch (error) {
			Logger.error(
				'VC Verification error:',
				error?.response?.data ?? error.message,
			);
			return {
				success: false,
				message:
					error?.response?.data?.message ??
					error.message ??
					'VC Verification failed',
				errors: error?.response?.data?.errors,
			};
		}
	}

	// Register watcher for e-wallet
	private async registerWatcherForEWallet(
		identifier: string,
		recordPublicId: string,
		email: string,
		callbackUrl: string,
		userDetails: any,
	): Promise<{ success: boolean; message?: string; data?: any }> {
		try {
			const walletUrl = process.env.WALLET_BASE_URL + '/api/wallet/vcs/watch';
			const authToken = userDetails.walletToken || '';
			const isWalletRegistrationEnabled = this.configService.get<string>('WALLET_REGISTRATION_ENABLED') !== 'false';

			if (!authToken) {
				const message = isWalletRegistrationEnabled 
					? 'Wallet token not found - user may not be registered with wallet'
					: 'Wallet registration is disabled - skipping watcher registration';
				
				Logger.warn(`E-Wallet watcher registration skipped: ${message}`);
				return {
					success: false,
					message: message,
					data: null,
				};
			}

			const payload = {
				vcPublicId: recordPublicId,
				email: email,
				callbackUrl: callbackUrl,
			};

			const response = await axios.post(walletUrl, payload, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`,
				},
				timeout: 10000,
			});

			return {
				success: true,
				message: 'Watcher registered successfully',
				data: response.data,
			};
		} catch (error) {
			Logger.error(
				'E-Wallet watcher registration error:',
				error?.response?.data ?? error.message,
			);
			return {
				success: false,
				message:
					error?.response?.data?.message ??
					error.message ??
					'Watcher registration failed',
				data: error?.response?.data,
			};
		}
	}

	// Register watcher for QR Code (Dhiway)
	private async registerWatcherForQRCode(
		identifier: string,
		recordPublicId: string,
		email: string,
		callbackUrl: string,
	): Promise<{ success: boolean; message?: string; data?: any }> {
		try {
			const dhiwayUrl = process.env.DHIWAY_WATCHER_URL;

			if (!dhiwayUrl) {
				return {
					success: false,
					message: 'DHIWAY_WATCHER_URL env variable not set',
				};
			}

			const payload = {
				identifier: identifier,
				recordPublicId: recordPublicId,
				email: email,
				callbackUrl: callbackUrl,
			};

			const response = await axios.post(dhiwayUrl, payload, {
				headers: {
					'Content-Type': 'application/json',
				},
				timeout: 10000,
			});

			return {
				success: true,
				message: 'Watcher registered successfully',
				data: response.data,
			};
		} catch (error) {
			Logger.error(
				'QR Code watcher registration error:',
				error?.response?.data ?? error.message,
			);
			return {
				success: false,
				message:
					error?.response?.data?.message ??
					error.message ??
					'Watcher registration failed',
				data: error?.response?.data,
			};
		}
	}

	// Register watcher based on imported_from
	private async registerWatcher(
		importedFrom: string,
		docData: any,
		docPath: string,
		email: string,
		callbackUrl: string,
		userDetails: any,
	): Promise<{ success: boolean; message?: string; data?: any }> {
		try {
			// Normalize docPath to ensure it ends with .json
			let normalizedDocPath = docPath;
			if (normalizedDocPath.endsWith('.vc')) {
				normalizedDocPath = normalizedDocPath.replace('.vc', '.json');
			} else if (!normalizedDocPath.endsWith('.json')) {
				normalizedDocPath = normalizedDocPath + '.json';
			}

			// Fetch document details from the path
			let fetchedDocData;
			try {
				const response = await axios.get(normalizedDocPath, {
					timeout: 10000,
					headers: {
						'Content-Type': 'application/json',
					},
				});
				fetchedDocData = response.data;
			} catch (fetchError) {
				Logger.error(
					'Failed to fetch document from path:',
					normalizedDocPath,
					fetchError,
				);
				return {
					success: false,
					message: `Failed to fetch document from path: ${normalizedDocPath}`,
				};
			}

			// Extract vcPublicId from fetched document data
			const identifier = fetchedDocData?.identifier || '';
			const recordPublicId = fetchedDocData?.publicId || '';
			const walletCallbackUrl = process.env.BASE_URL + '/users/wallet-callback';

			if (!identifier || !recordPublicId) {
				return {
					success: false,
					message:
						'identifier or recordPublicId not found in fetched document data',
				};
			}

			if (importedFrom.toLowerCase() === 'e-wallet') {
				return await this.registerWatcherForEWallet(
					identifier,
					recordPublicId,
					email,
					walletCallbackUrl,
					userDetails,
				);
			} else if (importedFrom.toLowerCase() === 'qr code') {
				return await this.registerWatcherForQRCode(
					identifier,
					recordPublicId,
					email,
					walletCallbackUrl,
				);
			} else {
				return {
					success: false,
					message: `Watcher registration not supported for imported_from: ${importedFrom}`,
				};
			}
		} catch (error) {
			Logger.error('Watcher registration error:', error);
			return {
				success: false,
				message: error.message || 'Watcher registration failed',
			};
		}
	}

	async deleteUser(userId: string): Promise<void> {
		const user = await this.userRepository.findOne({
			where: { user_id: userId },
		});

		if (!user) {
			throw new NotFoundException(`User with ID '${userId}' not found`);
		}

		await this.userRepository.delete(userId);
	}

	// Application Status Update Methods

	async getApplications(userId?: string) {
		try {
			const whereCondition: any = {
				status: Not(In(['amount received', 'rejected', 'disbursed'])),
				bpp_application_id: Not(IsNull()), // Only fetch applications with order_id
			};

			if (userId) {
				whereCondition.user_id = userId;
			}

			const applications = await this.userApplicationRepository.find({
				where: whereCondition,
			});

			return applications;
		} catch (error) {
			Logger.error(`Error while getting user applications: ${error}`);
			throw new InternalServerErrorException(
				'Failed to fetch user applications',
			);
		}
	}

	async updateStatus(
		application: any,
		statusData: { status: string; comment: string },
	) {
		try {
			// Skip update if statusData is null or status is not present
			if (!statusData?.status) {
				Logger.log(
					`Skipping status update for application ${application.id}: No status data received from BPP`,
				);
				return;
			}

			application.status = statusData.status.toLowerCase(); // e.g., "approved"
			application.remark = statusData.comment || ''; // Save the comment

			const queryRunner =
				this.userApplicationRepository.manager.connection.createQueryRunner();
			await queryRunner.connect();
			try {
				await queryRunner.startTransaction();
				await queryRunner.manager.save(application);
				await queryRunner.commitTransaction();
			} catch (error) {
				await queryRunner.rollbackTransaction();
				Logger.error(`Error in query runner: ${error}`);
				throw new Error('Error in query runner');
			} finally {
				await queryRunner.release();
			}
		} catch (error) {
			Logger.error(`Error while updating application status: ${error}`);
		}
	}

	async getStatus(orderId: string) {
		// Skip if orderId is null or empty
		if (!orderId) {
			Logger.warn('Skipping status check: order_id is null or empty');
			return null;
		}
		const bapId = this.configService.get<string>('BAP_ID');
		const bapUri = this.configService.get<string>('BAP_URI');

		// Fetch BPP info from userApplication table
		const userApplication = await this.userApplicationRepository.findOne({
			where: { bpp_application_id: orderId },
			select: ['benefit_provider_id', 'benefit_provider_uri', 'transaction_id'],
		});

		if (!userApplication) {
			throw new Error(`UserApplication not found for orderId: ${orderId}`);
		}

		const bppId = userApplication.benefit_provider_id;
		const bppUri = userApplication.benefit_provider_uri;
		const transactionId = userApplication.transaction_id;
		if (!bapId || !bapUri || !bppId || !bppUri || !transactionId) {
			throw new Error(
				'Missing required configuration for BAP/BPP or transaction_id not found in database',
			);
		}

		const body = {
			context: {
				domain: this.configService.get<string>('DOMAIN'),
				action: 'status',
				timestamp: new Date().toISOString(),
				ttl: 'PT10M',
				version: '1.1.0',
				bap_id: bapId,
				bap_uri: bapUri,
				bpp_id: bppId,
				bpp_uri: bppUri,
				transaction_id: transactionId,
				message_id: uuidv4(),
				location: {
					country: {
						name: 'India',
						code: 'IND',
					},
					city: {
						name: 'Bangalore',
						code: 'std:080',
					},
				},
			},
			message: {
				order_id: orderId,
			},
		};

		const response = await this.proxyService.bapCLientApi2('status', body);

		try {
			const rawStatus =
				response?.responses[0]?.message?.order?.fulfillments[0]?.state
					?.descriptor?.name;
			if (!rawStatus) {
				Logger.warn(
					`No fulfillments received in status response for order_id: ${orderId}`,
				);
				return null;
			}

			// Parse status stringified JSON
			const parsedStatus = JSON.parse(rawStatus);
			return parsedStatus; // { status: '...', comment: '...' }
		} catch (error) {
			console.error(`Error while getting status from response: ${error}`);
			throw new Error('Error while getting status from response');
		}
	}

	async processApplications(applications: any) {
		try {
			const results = await Promise.allSettled(
				applications.map(async (application: any) => {
					const statusData = await this.getStatus(
						application.bpp_application_id,
					);
					await this.updateStatus(application, statusData);
				}),
			);
			const failures = results.filter((r) => r.status === 'rejected');
			if (failures.length > 0) {
				Logger.error(
					`Failed to process ${failures.length} out of ${applications.length} applications`,
				);
			}
			return {
				total: applications.length,
				succeeded: results.filter((r) => r.status === 'fulfilled').length,
			};
		} catch (error) {
			Logger.error(`Error while processing applications: ${error}`);
			throw new InternalServerErrorException('Failed to process applications');
		}
	}

	async updateApplicationStatuses(req?: any) {
		try {
			let userId: string | undefined;

			// If req is provided, extract user_id from token
			if (req) {
				userId = req.mw_userid;
			}

			// Get user application records from database
			const applications = await this.getApplications(userId);

			if (applications.length === 0) {
				Logger.log(`No applications found for user: ${userId || 'all users'}`);
				return {
					success: true,
					message: `No applications found for ${userId ? 'user' : 'any users'}`,
					processedCount: 0,
				};
			}

			// Update status of each application
			await this.processApplications(applications);

			Logger.log(
				`Successfully processed ${applications.length} applications for ${userId || 'all users'}`,
			);

			return {
				success: true,
				message: `Successfully processed ${applications.length} applications`,
				processedCount: applications.length,
			};
		} catch (error) {
			Logger.error(`Error in update application statuses: ${error}`);
			throw new InternalServerErrorException(
				'Failed to update application statuses',
			);
		}
	}

	private async validateUserDocuments(userDocs: any[], recordPublicId: string) {
		if (!userDocs || userDocs.length === 0) {
			Logger.warn(
				`No user documents found for recordPublicId: ${recordPublicId}`,
			);
			return new ErrorResponse({
				statusCode: HttpStatus.NOT_FOUND,
				errorMessage: `No documents found for recordPublicId: ${recordPublicId}`,
			});
		}

		// Check if any document has empty doc_data_link
		const invalidDocs = userDocs.filter(
			(doc) =>
				!doc.doc_data_link ||
				doc.doc_data_link === '' ||
				doc.doc_data_link === null,
		);

		if (invalidDocs.length > 0) {
			Logger.warn(
				`Some documents have invalid doc_data_link for recordPublicId: ${recordPublicId}`,
			);
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: `Some documents have invalid doc_data_link for recordPublicId: ${recordPublicId}`,
			});
		}

		return null; // No error
	}

	private async fetchAndValidateWalletData(docDataLink: string) {
		let updatedDocData;

		try {
			updatedDocData = await this.fetchVcJsonFromVcUrl(docDataLink);
		} catch (error) {
			Logger.error(`Failed to fetch updated data from wallet: ${error}`);
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: 'Failed to fetch updated data from wallet',
			});
		}

		updatedDocData = updatedDocData?.data?.vcData?.details?.vc;

		if (!updatedDocData?.credentialSubject) {
			Logger.error(`Not a valid VC: ${updatedDocData}`);
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: 'Not a valid VC',
			});
		}

		return updatedDocData;
	}

	private async verifyVcData(vcData: any, issuer?: string) {
		let verificationResult;
		try {
			verificationResult = await this.verifyVcWithApi(vcData, issuer);
		} catch (error) {
			Logger.error(`VC Verification failed for wallet callback: ${error}`);
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: 'VC Verification failed for updated data',
			});
		}

		if (!verificationResult.success) {
			Logger.error(
				`VC Verification failed for wallet callback: ${verificationResult.message}`,
			);
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage:
					verificationResult.message ??
					'VC Verification failed for updated data',
			});
		}

		return null; // No error
	}

	private async updateDocumentsData(userDocs: any[], updatedDocData: any) {
		const updatedUserDocs = [];
		for (const userDoc of userDocs) {
			userDoc.doc_data = JSON.stringify(updatedDocData) as any;
			userDoc.doc_verified = true; // Mark as verified since it's from wallet callback

			// Save the updated document
			const updatedUserDoc = await this.userDocsRepository.save(userDoc);
			updatedUserDocs.push(updatedUserDoc);
		}
		return updatedUserDocs;
	}

	private async writeDocumentsToFiles(
		updatedUserDocs: any[],
		updatedDocData: any,
	) {
		const baseFolder = path.join(__dirname, 'userData');

		for (const updatedUserDoc of updatedUserDocs) {
			const userFilePath = path.join(baseFolder, 'undefined.json');

			try {
				await this.writeToFile(
					{
						user_id: updatedUserDoc.user_id,
						doc_type: updatedUserDoc.doc_type,
						doc_subtype: updatedUserDoc.doc_subtype,
						doc_name: updatedUserDoc.doc_name,
						imported_from: updatedUserDoc.imported_from,
						doc_path: updatedUserDoc.doc_path,
						doc_data_link: updatedUserDoc.doc_data_link,
						doc_data: updatedDocData,
						doc_datatype: updatedUserDoc.doc_datatype,
						watcher_registered: updatedUserDoc.watcher_registered,
						watcher_email: updatedUserDoc.watcher_email,
						watcher_callback_url: updatedUserDoc.watcher_callback_url,
					},
					userFilePath,
					updatedUserDoc,
				);
				Logger.log(
					`Successfully wrote updated data to file for user: ${updatedUserDoc.user_id}`,
				);
			} catch (fileError) {
				Logger.error(`Error writing updated data to file: ${fileError}`);
				// Don't fail the entire operation if file writing fails
			}
		}
	}

	private async updateUserProfiles(updatedUserDocs: any[]) {
		// Get unique user IDs to avoid duplicate profile updates
		const uniqueUserIds = [
			...new Set(updatedUserDocs.map((doc) => doc.user_id)),
		];

		for (const userId of uniqueUserIds) {
			try {
				const userDetails = await this.userRepository.findOne({
					where: { user_id: userId },
				});

				if (userDetails) {
					await this.updateProfile(userDetails);
					Logger.log(`Successfully updated profile for user: ${userId}`);
				} else {
					Logger.warn(`User not found for profile update: ${userId}`);
				}
			} catch (profileError) {
				Logger.error(
					`Error updating user profile for wallet callback: ${profileError}`,
				);
				// Don't fail the entire operation if profile update fails
			}
		}
	}

	async handleWalletCallback(callbackData: {
		identifier: string;
		message: string;
		type: string;
		recordPublicId: string;
	}) {
		try {
			const isWalletRegistrationEnabled = this.configService.get<string>('WALLET_REGISTRATION_ENABLED') !== 'false';
			
			if (!isWalletRegistrationEnabled) {
				Logger.warn('Wallet registration is disabled but received wallet callback - processing anyway for existing documents');
			}
			
			Logger.log(
				`Processing wallet callback for recordPublicId: ${callbackData.recordPublicId}`,
			);

			// Find all user documents that match the recordPublicId
			const userDocs = await this.userDocsRepository.find({
				where: {
					doc_data_link: ILike(`%/${callbackData.recordPublicId}.json`),
				},
			});

			// Validate user documents
			const validationError = await this.validateUserDocuments(
				userDocs,
				callbackData.recordPublicId,
			);
			if (validationError) return validationError;

			Logger.log(
				`Found ${userDocs.length} documents to update for recordPublicId: ${callbackData.recordPublicId}`,
			);

			// Fetch and validate wallet data
			const updatedDocData = await this.fetchAndValidateWalletData(
				userDocs[0].doc_data_link,
			);
			if (updatedDocData instanceof ErrorResponse) return updatedDocData;

			// Verify VC data
			const verificationError = await this.verifyVcData(updatedDocData);
			if (verificationError) return verificationError;

			// Update all documents with the new data
			const updatedUserDocs = await this.updateDocumentsData(
				userDocs,
				updatedDocData,
			);

			// Write updated data to files for all documents
			await this.writeDocumentsToFiles(updatedUserDocs, updatedDocData);

			// Update user profiles based on updated documents
			await this.updateUserProfiles(updatedUserDocs);

			Logger.log(
				`Successfully updated ${updatedUserDocs.length} documents with wallet callback data`,
			);

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: `${updatedUserDocs.length} documents updated successfully from wallet callback`,
				data: {
					updated_documents_count: updatedUserDocs.length,
					documents: updatedUserDocs.map((doc) => ({
						doc_id: doc.doc_id,
						doc_name: doc.doc_name,
						doc_type: doc.doc_type,
						doc_subtype: doc.doc_subtype,
						user_id: doc.user_id,
					})),
				},
			});
		} catch (error) {
			Logger.error(`Error processing wallet callback: ${error}`);
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: 'Failed to process wallet callback',
			});
		}
	}

	/**
	 * Upload a document file with metadata and store it in the database
	 * If a document with the same type, subtype, and name exists for the user, it will be updated
	 * @param req The request object containing authenticated user information
	 * @param file The uploaded file (from multer)
	 * @param uploadDocumentDto Metadata for the document
	 * @returns Success response with document details
	 */
	async uploadDocument(
		req: any,
		file: Express.Multer.File,
		uploadDocumentDto: UploadDocumentDto,
	) {
		try {
			const userDetails = await this.getUserDetails(req);
			const existingDoc = await this.findExistingDocument(
				userDetails.user_id,
				uploadDocumentDto,
			);

			// Validate and prepare document
			await this.validateDocumentType(uploadDocumentDto);
			const { requiresQRProcessing, documentConfig } =
				await this.getDocumentConfig(uploadDocumentDto);
			const issueVC =
				documentConfig?.issueVC?.toLowerCase() === 'yes' ? 'yes' : 'no';

			// Process document
			this.validateFileTypeForQr(requiresQRProcessing, file.mimetype);
			const ocrResult = await this.performOcr(
				file,
				uploadDocumentDto,
				requiresQRProcessing,
			);
			const vcMapping = await this.prepareVcMapping(
				ocrResult,
				uploadDocumentDto,
			);

			// Handle VC creation or file upload
			const { uploadResult, downloadUrl, vcCreationResult, issuer } =
				await this.handleDocumentStorage(
					file,
					uploadDocumentDto,
					documentConfig,
					issueVC,
					vcMapping,
					userDetails,
				);

			// Save document record
			const { savedDoc, isUpdate } = await this.saveDocumentRecord(
				existingDoc,
				userDetails.user_id,
				uploadResult,
				uploadDocumentDto,
				vcMapping,
				{ docDataLink: vcCreationResult?.verificationUrl, issueVC, issuer },
			);

			// Build and return response
			const responseData = this.buildResponseData(
				savedDoc,
				isUpdate,
				issueVC,
				downloadUrl,
				vcCreationResult,
				vcMapping,
			);

			return new SuccessResponse({
				statusCode: isUpdate ? HttpStatus.OK : HttpStatus.CREATED,
				message: isUpdate
					? 'Document updated successfully'
					: 'Document uploaded successfully',
				data: responseData,
			});
		} catch (error) {
			return this.handleUploadError(error);
		}
	}

	private async findExistingDocument(
		userId: string,
		uploadDocumentDto: UploadDocumentDto,
	) {
		return await this.userDocsRepository.findOne({
			where: {
				user_id: userId,
				doc_type: uploadDocumentDto.docType,
				doc_subtype: uploadDocumentDto.docSubType,
				doc_name: uploadDocumentDto.docName,
			},
		});
	}

	private async prepareVcMapping(
		ocrResult: any,
		uploadDocumentDto: UploadDocumentDto,
	) {
		const vcFields = await this.vcFieldsService.getVcFields(
			uploadDocumentDto.docType,
			uploadDocumentDto.docSubType,
		);

		if (!vcFields) {
			Logger.warn(
				`No vcFields configuration found for docType: ${uploadDocumentDto.docType}, docSubType: ${uploadDocumentDto.docSubType}`,
			);
			return {
				mapped_data: {},
				missing_fields: [],
				confidence: 0,
				processing_method: 'keyword' as const,
				warnings: ['No vcFields configuration found'],
			};
		}

		return await this.ocrMappingService.mapAfterOcr(
			{
				text: ocrResult.extractedText,
				docType: uploadDocumentDto.docType,
				docSubType: uploadDocumentDto.docSubType,
			},
			vcFields,
		);
	}

	private async handleDocumentStorage(
		file: Express.Multer.File,
		uploadDocumentDto: UploadDocumentDto,
		documentConfig: any,
		issueVC: string,
		vcMapping: any,
		userDetails: any,
	) {
		const issuer =
			uploadDocumentDto.issuer || documentConfig?.issuer || 'dhiway';
		let uploadResult;
		let downloadUrl = null;
		let vcCreationResult = null;

		if (issueVC === 'yes') {
			vcCreationResult = await this.createVcRecord(
				file,
				uploadDocumentDto,
				documentConfig,
				issuer,
				vcMapping,
				userDetails,
			);
			uploadResult = this.createPlaceholderUploadResult(
				userDetails.user_id,
				file,
			);
		} else {
			uploadResult = await this.uploadFileToStorage(
				file,
				uploadDocumentDto,
				userDetails.user_id,
			);
			downloadUrl = await this.documentUploadService.generateDownloadUrl(
				uploadResult.filePath,
			);
		}

		return { uploadResult, downloadUrl, vcCreationResult, issuer };
	}

	private async createVcRecord(
		file: Express.Multer.File,
		uploadDocumentDto: UploadDocumentDto,
		documentConfig: any,
		issuer: string,
		vcMapping: any,
		userDetails: any,
	) {
		Logger.log(
			`Creating VC for document: ${uploadDocumentDto.docType}/${uploadDocumentDto.docSubType}`,
		);

		const spaceId = documentConfig?.spaceId;
		if (!spaceId) {
			throw new BadRequestException(
				'Space ID is required for VC creation. Please configure spaceId in vcConfiguration.',
			);
		}

		const vcFields = await this.vcFieldsService.getVcFields(
			uploadDocumentDto.docType,
			uploadDocumentDto.docSubType,
		);
		await this.validateRequiredFieldsFromOcrMapping(
			vcFields,
			vcMapping,
			uploadDocumentDto,
		);

		const vcCreationResult = await this.vcAdapterFactory.createRecord(
			issuer,
			spaceId,
			vcMapping.mapped_data,
			file,
			userDetails.user_id,
			vcFields,
		);

		if (!vcCreationResult.success) {
			throw new InternalServerErrorException(
				vcCreationResult.message || 'Failed to create VC record',
			);
		}

		Logger.log(
			`VC created successfully - Record ID: ${vcCreationResult.recordId}`,
		);
		return vcCreationResult;
	}

	private createPlaceholderUploadResult(
		userId: string,
		file: Express.Multer.File,
	) {
		return {
			filePath: `local://${userId}/${Date.now()}-${file.originalname}`,
			docDatatype: file.mimetype,
			uploadedAt: new Date(),
		};
	}

	private async uploadFileToStorage(
		file: Express.Multer.File,
		uploadDocumentDto: UploadDocumentDto,
		userId: string,
	) {
		return await this.documentUploadService.uploadFile(
			file,
			{
				docType: uploadDocumentDto.docType,
				docSubType: uploadDocumentDto.docSubType,
				docName: uploadDocumentDto.docName,
				importedFrom: uploadDocumentDto.importedFrom,
			},
			userId,
		);
	}

	private async saveDocumentRecord(
		existingDoc: UserDoc | null,
		userId: string,
		uploadResult: any,
		uploadDocumentDto: UploadDocumentDto,
		vcMapping: any,
		options: { docDataLink?: string; issueVC: string; issuer: string },
	) {
		return existingDoc
			? await this.updateExistingDoc(
					existingDoc,
					uploadResult,
					uploadDocumentDto,
					vcMapping,
					options.docDataLink,
					options.issueVC,
					options.issuer,
				)
			: await this.createNewDoc(
					userId,
					uploadResult,
					uploadDocumentDto,
					vcMapping,
					options.docDataLink,
					options.issueVC,
					options.issuer,
				);
	}

	private buildResponseData(
		savedDoc: UserDoc,
		isUpdate: boolean,
		issueVC: string,
		downloadUrl: string | null,
		vcCreationResult: any,
		vcMapping: any,
	) {
		const responseData: any = {
			doc_id: savedDoc.doc_id,
			user_id: savedDoc.user_id,
			doc_type: savedDoc.doc_type,
			doc_subtype: savedDoc.doc_subtype,
			doc_name: savedDoc.doc_name,
			imported_from: savedDoc.imported_from,
			doc_datatype: savedDoc.doc_datatype,
			uploaded_at: savedDoc.uploaded_at,
			is_update: isUpdate,
			issue_vc: issueVC,
		};

		if (downloadUrl) {
			responseData.download_url = downloadUrl;
		}

		if (vcCreationResult?.success) {
			responseData.vc_creation = {
				success: true,
				record_id: vcCreationResult.recordId,
				verification_url: vcCreationResult.verificationUrl,
			};
			responseData.doc_data_link = vcCreationResult.verificationUrl;
		}

		if (vcMapping?.mapped_data) {
			responseData.mapped_data = vcMapping.mapped_data;
		}

		return responseData;
	}

	private handleUploadError(error: any) {
		Logger.error(
			'users.service:uploadDocument',
			error?.message ?? error,
			error?.stack,
		);

		if (error?.code === '23505') {
			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: 'Duplicate document entry',
			});
		}

		if (
			error instanceof BadRequestException ||
			error instanceof InternalServerErrorException
		) {
			return new ErrorResponse({
				statusCode: error.getStatus(),
				errorMessage: error.message,
			});
		}

		if (error?.response?.statusCode && error?.response?.message) {
			return new ErrorResponse({
				statusCode: error.response.statusCode,
				errorMessage: error.response.message,
			});
		}

		return new ErrorResponse({
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			errorMessage: error?.message || 'Failed to upload document',
		});
	}

	// Wrapper method to get vcFields for a document type
	public async getVcFieldsForDocument(docType: string, docSubType: string) {
		return await this.vcFieldsService.getVcFields(docType, docSubType);
	}

	// Expose ocrMapping service for external use
	public get ocrMapping() {
		return this.ocrMappingService;
	}

	// Helper to get document configuration and QR processing requirement
	public async getDocumentConfig(
		uploadDocumentDto: UploadDocumentDto,
	): Promise<{ requiresQRProcessing: boolean; documentConfig?: any }> {
		let requiresQRProcessing = false;
		let documentConfig = null;

		if (!uploadDocumentDto.docSubType) {
			return { requiresQRProcessing, documentConfig };
		}

		try {
			const vcConfig =
				await this.adminService.getConfigByKey('vcConfiguration');
			if (vcConfig?.value && Array.isArray(vcConfig.value)) {
				documentConfig = vcConfig.value.find(
					(doc: any) => doc.documentSubType === uploadDocumentDto.docSubType,
				);

				if (documentConfig) {
					requiresQRProcessing = documentConfig.issueVC?.toLowerCase() === 'no';
					Logger.log(
						`Document config for ${uploadDocumentDto.docSubType}: issueVC=${documentConfig.issueVC}, ` +
							`requiresQRProcessing=${requiresQRProcessing}`,
					);
				}
			}
		} catch (configError) {
			Logger.warn(
				`Failed to fetch document configuration: ${configError.message}`,
			);
		}

		return { requiresQRProcessing, documentConfig };
	}

	// Helper to validate document type and subtype
	public async validateDocumentType(uploadDocumentDto: UploadDocumentDto) {
		if (!uploadDocumentDto.docType || uploadDocumentDto.docType.trim() === '') {
			throw new BadRequestException(
				'Document type is required and cannot be empty.',
			);
		}

		if (
			!uploadDocumentDto.docSubType ||
			uploadDocumentDto.docSubType.trim() === ''
		) {
			throw new BadRequestException(
				'Document subtype is required and cannot be empty.',
			);
		}
	}

	// Helper to validate required fields using OCR mapping results
	private async validateRequiredFieldsFromOcrMapping(
		vcFields: VcFields,
		vcMapping: any,
		uploadDocumentDto: UploadDocumentDto,
	) {
		try {
			Logger.log(
				`Validating required fields - vcFields: ${Object.keys(vcFields || {}).length} fields, vcMapping present: ${!!vcMapping}`,
			);
			Logger.debug(`vcFields structure: ${JSON.stringify(vcFields, null, 2)}`);

			if (!vcFields || !vcMapping) {
				throw new BadRequestException(
					'Cannot validate required fields: missing vcFields configuration or mapping data',
				);
			}

			const allMissingRequired = this.collectMissingRequiredFields(
				vcFields,
				vcMapping,
			);
			this.logValidationResults(vcFields, vcMapping, allMissingRequired);

			if (allMissingRequired.length > 0) {
				this.throwMissingFieldsError(allMissingRequired, uploadDocumentDto);
			}

			const requiredFieldsCount = Object.values(vcFields).filter(
				(config) => config?.required === true,
			).length;
			Logger.log(
				`All ${requiredFieldsCount} required fields are present for VC creation`,
			);
		} catch (error) {
			Logger.error(
				`Error in validateRequiredFieldsFromOcrMapping: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	private collectMissingRequiredFields(
		vcFields: VcFields,
		vcMapping: any,
	): string[] {
		const missingFields = vcMapping.missing_fields || [];
		Logger.log(
			`OCR Mapping - Total missing fields: [${missingFields.join(', ')}]`,
		);

		const missingRequiredFields = this.filterRequiredFields(
			vcFields,
			missingFields,
		);
		const additionalMissingRequired =
			this.checkMappedDataForEmptyRequiredFields(
				vcFields,
				vcMapping,
				missingRequiredFields,
			);

		return [...missingRequiredFields, ...additionalMissingRequired];
	}

	private filterRequiredFields(
		vcFields: VcFields,
		missingFields: string[],
	): string[] {
		const missingRequiredFields: string[] = [];
		for (const fieldName of missingFields) {
			// Only check required document fields (exclude fields with document_field: false)
			if (vcFields[fieldName]?.required === true && vcFields[fieldName]?.document_field !== false) {
				missingRequiredFields.push(fieldName);
			}
		}
		return missingRequiredFields;
	}

	private checkMappedDataForEmptyRequiredFields(
		vcFields: VcFields,
		vcMapping: any,
		missingRequiredFields: string[],
	): string[] {
		const additionalMissingRequired: string[] = [];
		for (const [fieldName, fieldConfig] of Object.entries(vcFields)) {
			// Only check required document fields (exclude fields with document_field: false)
			if (fieldConfig?.required === true && fieldConfig?.document_field !== false) {
				const fieldValue = vcMapping.mapped_data?.[fieldName];
				if (
					this.isFieldValueEmpty(fieldValue) &&
					!missingRequiredFields.includes(fieldName)
				) {
					additionalMissingRequired.push(fieldName);
				}
			}
		}
		return additionalMissingRequired;
	}

	private isFieldValueEmpty(fieldValue: any): boolean {
		return (
			fieldValue === null ||
			fieldValue === undefined ||
			(typeof fieldValue === 'string' && fieldValue.trim() === '')
		);
	}

	private logValidationResults(
		vcFields: VcFields,
		vcMapping: any,
		allMissingRequired: string[],
	): void {
		Logger.log(
			`Required field validation - Missing required fields: [${allMissingRequired.join(', ')}]`,
		);
		Logger.debug(
			`Mapped data keys: [${Object.keys(vcMapping.mapped_data || {}).join(', ')}]`,
		);

		if (!vcMapping.mapped_data?.studentuniqueid && vcFields.studentuniqueid) {
			Logger.warn(
				`CRITICAL: studentuniqueid is missing from mapped data but present in vcFields config. Required: ${vcFields.studentuniqueid?.required}`,
			);
		}
	}

	private throwMissingFieldsError(
		allMissingRequired: string[],
		uploadDocumentDto: UploadDocumentDto,
	): void {
		const fieldList = allMissingRequired.join(', ');
		const errorMessage =
			`Missing required field(s) for VC creation: ${fieldList}. ` +
			`Document Type: ${uploadDocumentDto.docType}/${uploadDocumentDto.docSubType}. ` +
			`OCR could not extract these required fields from the uploaded document. ` +
			`Please ensure these fields are clearly visible and readable in the document.`;

		Logger.error(`VC validation failed: ${errorMessage}`);
		throw new BadRequestException(errorMessage);
	}

	// Helper to validate file type when QR processing is required
	public async validateFileTypeForQr(
		requiresQRProcessing: boolean,
		mimetype: string,
	) {
		if (requiresQRProcessing && mimetype === 'application/pdf') {
			throw new BadRequestException(
				'QR processing failed: PDF QR code extraction is not supported. Please upload an image with a QR code.',
			);
		}
	}

	// Helper to perform OCR extraction and validations
	public async performOcr(
		file: Express.Multer.File,
		uploadDocumentDto: UploadDocumentDto,
		requiresQRProcessing: boolean,
	) {
		try {
			Logger.log(
				`Starting OCR extraction ${requiresQRProcessing ? 'with QR processing' : 'without QR processing'} for document validation`,
			);

			const extractedData = requiresQRProcessing
				? await this.ocrService.extractTextFromBufferWithQR(
						file.buffer,
						file.mimetype,
						uploadDocumentDto.docSubType,
					)
				: await this.ocrService.extractTextFromBuffer(
						file.buffer,
						file.mimetype,
					);

			const ocrResult = {
				extractedText: extractedData.fullText,
				confidence: extractedData.confidence,
				metadata: extractedData.metadata,
				qrProcessing:
					requiresQRProcessing && 'qrProcessing' in extractedData
						? extractedData.qrProcessing
						: undefined,
			};

			Logger.log(
				`OCR processing successful. Extracted ${extractedData.fullText.length} characters with ${extractedData.confidence}% confidence` +
					(requiresQRProcessing &&
					'qrProcessing' in extractedData &&
					extractedData.qrProcessing &&
					(extractedData.qrProcessing as any)?.qrCodeDetected
						? ` (QR code processed)`
						: ''),
			);

			if (extractedData.fullText.length === 0) {
				Logger.error(`OCR validation failed: No text extracted from document`);
				throw new BadRequestException(
					'Document validation failed: No readable text found in the uploaded document. Please ensure the document contains clear, readable text and try again.',
				);
			}

			if (extractedData.confidence < 10) {
				Logger.error(
					`OCR validation failed: Very low confidence (${extractedData.confidence}%)`,
				);
				throw new BadRequestException(
					'Document validation failed: The document quality is too poor for reliable text extraction. Please upload a clearer, higher-quality image or document.',
				);
			}

			return ocrResult;
		} catch (ocrError) {
			Logger.error(`OCR processing failed: ${ocrError.message}`);

			// If it's already a BadRequestException (like QR processing errors), preserve the user-friendly message
			if (ocrError instanceof BadRequestException) {
				throw ocrError;
			}

			// For other errors, wrap in InternalServerErrorException
			throw new InternalServerErrorException(
				`Document processing failed: ${ocrError.message}`,
			);
		}
	}

	// Helper methods for document management

	private async updateExistingDoc(
		existingDoc: UserDoc,
		uploadResult: any,
		uploadDocumentDto: UploadDocumentDto,
		vcMapping: any,
		docDataLink?: string,
		issueVC?: string,
		issuer?: string,
	): Promise<{ savedDoc: UserDoc; isUpdate: boolean }> {
		const previousPath = existingDoc.doc_path;
		existingDoc.doc_path = uploadResult.filePath;
		existingDoc.imported_from = uploadDocumentDto.importedFrom;
		existingDoc.doc_datatype = uploadResult.docDatatype;
		existingDoc.uploaded_at = uploadResult.uploadedAt;

		// Set doc_data based on issueVC flag
		// If issueVC is "yes", set doc_data as empty object (data will be updated through different action)
		// Otherwise, store mapped_data (will be automatically encrypted)
		if (issueVC === 'yes') {
			existingDoc.doc_data = JSON.stringify({}) as any;
		} else if (vcMapping?.mapped_data) {
			existingDoc.doc_data = JSON.stringify(vcMapping.mapped_data) as any;
		}

		// Set issuer if provided
		if (issuer) {
			existingDoc.issuer = issuer;
		}

		// Set doc_verified as false (document needs verification)
		existingDoc.doc_verified = false;

		// Set doc_data_link if provided (from VC creation)
		if (docDataLink) {
			existingDoc.doc_data_link = docDataLink;
		}

		const savedDoc = await this.userDocsRepository.save(existingDoc);
		if (previousPath) {
			await this.documentUploadService.deleteFile(previousPath);
		}
		Logger.log(`Document updated successfully: ${savedDoc.doc_id}`);
		return { savedDoc, isUpdate: true };
	}

	public async createNewDoc(
		userId: string,
		uploadResult: any,
		uploadDocumentDto: UploadDocumentDto,
		vcMapping: any,
		docDataLink?: string,
		issueVC?: string,
		issuer?: string,
	): Promise<{ savedDoc: UserDoc; isUpdate: boolean }> {
		// Set doc_data based on issueVC flag
		// If issueVC is "yes", set doc_data as empty object (data will be updated through different action)
		// Otherwise, store mapped_data (will be automatically encrypted)
		let docData = null;
		if (issueVC === 'yes') {
			docData = JSON.stringify({}) as any;
		} else if (vcMapping?.mapped_data) {
			docData = JSON.stringify(vcMapping.mapped_data) as any;
		}

		const newUserDoc = this.userDocsRepository.create({
			user_id: userId,
			doc_type: uploadDocumentDto.docType,
			doc_subtype: uploadDocumentDto.docSubType,
			doc_name: uploadDocumentDto.docName,
			imported_from: uploadDocumentDto.importedFrom,
			doc_path: uploadResult.filePath,
			doc_data: docData,
			doc_datatype: uploadResult.docDatatype,
			doc_verified: false, // Set as false instead of null - document needs verification
			watcher_registered: false,
			watcher_email: null,
			watcher_callback_url: null,
			doc_data_link: docDataLink || null,
			issuer: issuer || null,
		});

		const savedDoc = await this.userDocsRepository.save(newUserDoc);
		Logger.log(`Document uploaded successfully: ${savedDoc.doc_id}`);
		return { savedDoc, isUpdate: false };
	}
}
