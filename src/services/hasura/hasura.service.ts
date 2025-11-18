import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ErrorResponse } from 'src/common/responses/error-response';
import { SuccessResponse } from 'src/common/responses/success-response';

@Injectable()
export class HasuraService {
  private readonly logger = new Logger(HasuraService.name);
  private readonly adminSecretKey = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  private readonly cache_db = process.env.CACHE_DB;
  private readonly response_cache_db = process.env.RESPONSE_CACHE_DB;
  private readonly seeker_db = process.env.SEEKER_DB;
  private readonly order_db = process.env.ORDER_DB;
  private readonly telemetry_db = process.env.TELEMETRY_DB;
  private readonly url = process.env.HASURA_URL;

  constructor() {
  }

  async findJobsCache(requestBody) {
    const { filters, search, defaultEligibility } = requestBody;

    const query = `query MyQuery {
           ${this.cache_db}(distinct_on: unique_id) {
            id
            unique_id
            item_id
            provider_id
            provider_name
            bpp_id
            bpp_uri
            title
            description
            url
            item
            descriptor
            categories
            fulfillments
          }
          }`;
    try {
      const response = await this.queryDb(query);
      const jobs = response.data[this.cache_db];

      let filteredJobs = this.filterJobs(jobs, filters, search);

      // Apply default eligibility filtering if provided
      if (defaultEligibility && Array.isArray(defaultEligibility) && defaultEligibility.length > 0) {
        filteredJobs = this.applyDefaultEligibility(filteredJobs, defaultEligibility);
      }

      return new SuccessResponse({
        statusCode: HttpStatus.OK,
        message: 'Ok.',

        data: {
          ubi_network_cache: filteredJobs,
        },
      });
    } catch (error) {
      //this.logger.error("Something Went wrong in creating Admin", error);
      return new ErrorResponse({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage: error.message, // Use error message if available
      });
    }
  }

  /**
   * Normalize condition string to standardized format
   * @param condition - Raw condition string
   * @returns Normalized condition string
   */
  private normalizeCondition(condition: string): string {
    return String(condition)
      .toLowerCase()
      .replaceAll(/[\s]+/g, '')  // Remove all whitespace
      .replaceAll(/[^a-z0-9=<>]/g, '') // Keep only alphanumeric and comparison operators
      .replaceAll(/[=<>]+/g, match => {
        // Normalize symbolic operators
        switch (match) {
          case '=': return 'equals';
          case '<=': return 'lte';
          case '>=': return 'gte';
          case '<': return 'lt';
          case '>': return 'gt';
          default: return match;
        }
      });
  }

  /**
   * Handle annual income comparison with special logic
   * @param userValue - User's annual income value
   * @param conditionValues - Condition values from criteria
   * @returns true if condition is met
   */
  private handleAnnualIncomeEligibility(userValue: string, conditionValues: string[]): boolean {
    let annualIncomeValue;

    // Handle range format (e.g., "0-270000")
    if (userValue.includes('-')) {
      const [min, max] = userValue.split('-').map(v => Number.parseFloat(v.trim()));
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        annualIncomeValue = max;
      }
    }
    // Handle monthly income (convert to annual)
    else if (Number.parseFloat(userValue) <= 100000) { // Assuming monthly income won't exceed 1L
      annualIncomeValue = Number.parseFloat(userValue) * 12;
    }
    // Handle direct annual income
    else {
      annualIncomeValue = Number.parseFloat(userValue);
    }

    if (!Number.isNaN(annualIncomeValue)) {
      const conditionValue = Number.parseFloat(conditionValues[0]);
      if (!Number.isNaN(conditionValue)) {
        return annualIncomeValue <= conditionValue;
      }
    }
    return false;
  }

  /**
   * Evaluate eligibility condition between tag value and user value
   * @param tagValue - Stringified JSON value from job tag containing criteria
   * @param userValue - User's value for comparison
   * @param fieldKey - The field key (e.g., 'state', 'annualIncome')
   * @returns true if values match based on criteria condition
   */
  evaluateEligibilityCondition(tagValue: any, userValue: any, fieldKey: string): boolean {
    try {
      // Handle simple string/array comparison (backward compatibility)
      if (typeof tagValue === 'string' && !tagValue.startsWith('{')) {
        return tagValue.toLowerCase().trim() === String(userValue).toLowerCase().trim();
      }

      if (Array.isArray(tagValue)) {
        return tagValue.includes(userValue);
      }

      // Parse the stringified JSON tag value
      const parsedTagValue = typeof tagValue === 'string' ? JSON.parse(tagValue) : tagValue;

      // Extract criteria from parsed value
      const criteria = parsedTagValue?.criteria;
      if (!criteria) {
        // If no criteria, fall back to simple comparison
        return false;
      }

      const condition = this.normalizeCondition(criteria.condition || 'equals');

      // Get condition values from criteria
      const conditionValues = Array.isArray(criteria.conditionValues)
        ? criteria.conditionValues
        : [criteria.conditionValues];

      // Clean and normalize values
      const cleanUserValue = String(userValue).trim().toLowerCase();
      const cleanConditionValues = conditionValues.map(v => String(v).trim().toLowerCase());

      // Special handling for annualIncome
      if (fieldKey === 'annualIncome' || criteria.name === 'annualIncome') {
        return this.handleAnnualIncomeEligibility(cleanUserValue, cleanConditionValues);
      }

      // Evaluate based on condition type
      switch (condition) {
        case 'in':
        case 'contains':
        case 'includes':
          return cleanConditionValues.some(value => {
            const exactMatch = value === cleanUserValue;
            const valueIncludes = value.includes(cleanUserValue);
            const userIncludes = cleanUserValue.includes(value);
            return exactMatch || valueIncludes || userIncludes;
          });

        case 'equals':
        case 'equal':
        case 'exact':
        case 'match':
        case '=':
          return cleanConditionValues[0] === cleanUserValue ||
            cleanConditionValues[0].replaceAll(/[^a-zA-Z0-9]/g, '') === cleanUserValue.replaceAll(/[^a-zA-Z0-9]/g, '');

        case 'lessthanequals':
        case 'lte':
        case 'lessthanorequal':
        case '<=': {
          const userNum = Number.parseFloat(cleanUserValue);
          const conditionNum = Number.parseFloat(cleanConditionValues[0]);
          return !Number.isNaN(userNum) && !Number.isNaN(conditionNum) && userNum <= conditionNum;
        }

        case 'greaterthanequals':
        case 'gte':
        case 'greaterthanorequal':
        case '>=': {
          const userNumGte = Number.parseFloat(cleanUserValue);
          const conditionNumGte = Number.parseFloat(cleanConditionValues[0]);
          return !Number.isNaN(userNumGte) && !Number.isNaN(conditionNumGte) && userNumGte >= conditionNumGte;
        }

        case 'lessthan':
        case 'lt':
        case '<': {
          const userNumLt = Number.parseFloat(cleanUserValue);
          const conditionNumLt = Number.parseFloat(cleanConditionValues[0]);
          return !Number.isNaN(userNumLt) && !Number.isNaN(conditionNumLt) && userNumLt < conditionNumLt;
        }

        case 'greaterthan':
        case 'gt':
        case '>': {
          const userNumGt = Number.parseFloat(cleanUserValue);
          const conditionNumGt = Number.parseFloat(cleanConditionValues[0]);
          return !Number.isNaN(userNumGt) && !Number.isNaN(conditionNumGt) && userNumGt > conditionNumGt;
        }

        default: {
          // Default to contains/includes behavior
          const valueIncludes = cleanConditionValues[0].includes(cleanUserValue);
          const userIncludes = cleanUserValue.includes(cleanConditionValues[0]);
          return valueIncludes || userIncludes;
        }
      }
    } catch (error) {
      console.error('Error evaluating eligibility condition:', error.message);
      return false;
    }
  }

  /**
   * Apply default eligibility filtering to jobs based on user's eligibility values
   * @param jobs - Array of jobs to filter
   * @param defaultEligibility - Array of eligibility rules with user values
   * @returns Filtered array of jobs that meet all eligibility criteria
   */
  applyDefaultEligibility(jobs: any[], defaultEligibility: any[]): any[] {
    // If no eligibility rules, return all jobs
    if (!defaultEligibility || defaultEligibility.length === 0) {
      return jobs;
    }

    return jobs.filter(job => this.jobMeetsAllEligibilityRules(job, defaultEligibility));
  }

  /**
   * Check if a job meets all eligibility rules
   * @param job - Job to check
   * @param defaultEligibility - Array of eligibility rules
   * @returns true if job meets all rules, false otherwise
   */
  private jobMeetsAllEligibilityRules(job: any, defaultEligibility: any[]): boolean {
    for (const rule of defaultEligibility) {
      if (!this.shouldApplyRule(rule)) {
        continue;
      }

      if (!this.jobMeetsEligibilityRule(job, rule)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a rule should be applied
   * @param rule - Eligibility rule
   * @returns true if rule should be applied
   */
  private shouldApplyRule(rule: any): boolean {
    // Skip if rule should not be applied
    if (!rule.isApply) {
      return false;
    }

    // Skip if user value is missing or null
    if (rule.userValue === null || rule.userValue === undefined) {
      return false;
    }

    return true;
  }

  /**
   * Check if a job meets a specific eligibility rule
   * @param job - Job to check
   * @param rule - Eligibility rule
   * @returns true if job meets the rule
   */
  private jobMeetsEligibilityRule(job: any, rule: any): boolean {
    const tags = job.item?.tags;
    if (!Array.isArray(tags)) {
      return false;
    }

    const matchingTagItems = this.findMatchingTagItems(tags, rule.key);


    if (matchingTagItems.length === 0) {
      return false;
    }

    return this.anyTagMatchesUserValue(matchingTagItems, rule.userValue, rule.key);
  }

  /**
   * Find all tag items that match the rule key
   * @param tags - Array of tags from job item
   * @param ruleKey - Key to match
   * @returns Array of matching tag items
   */
  private findMatchingTagItems(tags: any[], ruleKey: string): any[] {
    const matchingTagItems = [];

    for (const tag of tags) {
      if (Array.isArray(tag.list)) {
        for (const listItem of tag.list) {
          if (listItem.descriptor?.code === ruleKey) {
            matchingTagItems.push(listItem);
          }
        }
      }
    }

    return matchingTagItems;
  }

  /**
   * Check if any tag item matches the user value
   * @param matchingTagItems - Array of tag items to check
   * @param userValue - User's value for comparison
   * @param ruleKey - Rule key for context
   * @returns true if any tag matches
   */
  private anyTagMatchesUserValue(
    matchingTagItems: any[],
    userValue: any,
    ruleKey: string,
  ): boolean {
    return matchingTagItems.some(item => {
      return this.evaluateEligibilityCondition(item.value, userValue, ruleKey);
    });
  }

  filterJobs(jobs, filters, search) {
    if (!filters && !search) return jobs;

    // First filter by item_id if present
    if (filters?.item_id) {
      jobs = jobs.filter(job => job.item_id === filters.item_id);
    }
    const handleAnnualIncome = (cleanFilterValue: string, cleanConditionValues: string[]): boolean => {
      let annualIncomeValue;

      // Handle range format (e.g., "0-270000")
      if (cleanFilterValue.includes('-')) {
        const [min, max] = cleanFilterValue.split('-').map(v => Number.parseFloat(v.trim()));
        if (!Number.isNaN(min) && !Number.isNaN(max)) {
          annualIncomeValue = max;
        }
      }
      // Handle direct annual income
      else {
        annualIncomeValue = Number.parseFloat(cleanFilterValue);
      }

      if (!Number.isNaN(annualIncomeValue)) {
        const conditionValue = Number.parseFloat(cleanConditionValues[0]);
        if (!Number.isNaN(conditionValue)) {
          return annualIncomeValue <= conditionValue;
        }
      }
      return false;
    };

    const evaluateCondition = (tagValueJson, filterKey, filterValue) => {
      try {
        const tagValue = JSON.parse(tagValueJson);
        const condition = this.normalizeCondition(tagValue.condition);

        // Get condition values from the criteria object
        const conditionValues = Array.isArray(tagValue.criteria?.conditionValues)
          ? tagValue.criteria.conditionValues
          : [tagValue.criteria?.conditionValues];

        // Clean and normalize values
        const cleanFilterValue = String(filterValue).trim().toLowerCase();
        const cleanConditionValues = conditionValues.map(v => String(v).trim().toLowerCase());

        // Special handling for annualIncome
        if (filterKey === 'annualIncome') {
          return handleAnnualIncome(cleanFilterValue, cleanConditionValues);
        }

        switch (condition) {
          case 'in':
          case 'contains':
          case 'includes':
            return cleanConditionValues.some(value => {
              const exactMatch = value === cleanFilterValue;
              const valueIncludes = value.includes(cleanFilterValue);
              const filterIncludes = cleanFilterValue.includes(value);
              return exactMatch ?? valueIncludes ?? filterIncludes;
            });

          case 'equals':
          case 'equal':
          case 'exact':
          case 'match':
          case '=':
            return cleanConditionValues[0] === cleanFilterValue ||
              cleanConditionValues[0].replaceAll(/[^a-zA-Z0-9]/g, '') === cleanFilterValue.replaceAll(/[^a-zA-Z0-9]/g, '');

          case 'lessthanequals':
          case 'lte':
          case 'lessthanorequal':
          case '<=': {
            const filterNum = Number.parseFloat(cleanFilterValue);
            const conditionNum = Number.parseFloat(cleanConditionValues[0]);
            return !Number.isNaN(filterNum) && !Number.isNaN(conditionNum) && filterNum <= conditionNum;
          }

          case 'greaterthanequals':
          case 'gte':
          case 'greaterthanorequal':
          case '>=': {
            const filterNumGt = Number.parseFloat(cleanFilterValue);
            const conditionNumGt = Number.parseFloat(cleanConditionValues[0]);
            return !Number.isNaN(filterNumGt) && !Number.isNaN(conditionNumGt) && filterNumGt >= conditionNumGt;
          }

          case 'lessthan':
          case 'lt':
          case '<': {
            const filterNumLt = Number.parseFloat(cleanFilterValue);
            const conditionNumLt = Number.parseFloat(cleanConditionValues[0]);
            return !Number.isNaN(filterNumLt) && !Number.isNaN(conditionNumLt) && filterNumLt < conditionNumLt;
          }

          case 'greaterthan':
          case 'gt':
          case '>': {
            const filterNumGt2 = Number.parseFloat(cleanFilterValue);
            const conditionNumGt2 = Number.parseFloat(cleanConditionValues[0]);
            return !Number.isNaN(filterNumGt2) && !Number.isNaN(conditionNumGt2) && filterNumGt2 > conditionNumGt2;
          }

          default: {
            const valueIncludes = cleanConditionValues[0].includes(cleanFilterValue);
            const filterIncludes = cleanFilterValue.includes(cleanConditionValues[0]);
            return valueIncludes ?? filterIncludes;
          }
        }
      } catch (error) {
        console.error('Error evaluating condition:', error.message);
        return false;
      }
    };

    // Function to match filters dynamically
    const matchFilters = (tags, filters) => {
      return Object.keys(filters).every((filterKey) => {
        const filterValue = filters[filterKey]?.trim().toLowerCase();

        // Skip filtering for empty filter values
        if (!filterValue) {
          return true;
        }

        // Find all tags matching the filter key
        const matchingTags = tags.filter((t) =>
          t.list.some((item) => item.descriptor.code === filterKey),
        );

        // If no matching tags exist for the filter key, include the job
        if (!matchingTags.length) {
          return true;
        }

        // Check if any of the matching tags meet the filter condition
        return matchingTags.some((tag) =>
          tag.list.some((item) => {
            const tagValue = item.value;
            return (
              tagValue && evaluateCondition(tagValue, filterKey, filterValue)
            );
          }),
        );
      });
    };

    return jobs.filter((job) => {
      let matches = true;

      // Perform search on title (case-insensitive)
      if (search) {
        matches =
          job.title?.toLowerCase()?.includes(search.toLowerCase()) ?? false;
      }

      if (!matches) return false;

      const tags = job.item?.tags;
      if (!Array.isArray(tags)) return false;

      // Match all filters dynamically
      return matchFilters(tags, filters);
    });
  }

  async searchResponse(data) {

    let result = 'where: {';
    Object.entries(data).forEach(([key, value]) => {

      result += `${key}: {_eq: "${value}"}, `;
    });
    result += '}';
    const query = `query MyQuery {
            ${this.response_cache_db}(${result}) {
                id
                action
                transaction_id
                response
          }
          }`;
    try {
      const response = await this.queryDb(query);
      return response;
    } catch (error) {
      //this.logger.error("Something Went wrong in creating Admin", error);
      console.log('error', error);
      throw new HttpException(
        'Unable to Fetch content!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async insertCacheData(arrayOfObjects: any[], bpps: string[]) {
    this.logger.log(
      `Starting cache refresh for ${bpps.length} BPP(s): ${bpps.join(', ')}`,
    );
    this.logger.log(
      `Deleting existing records and inserting ${arrayOfObjects.length} new records`,
    );

    // First delete existing records for the specified BPPs only
    if (bpps.length > 0) {
      try {
        await this.deleteJobsByBpps(bpps);
        this.logger.log(
          `Successfully deleted records for BPPs: ${bpps.join(', ')}`,
        );
      } catch (error) {
        this.logger.error('Error deleting existing records for BPPs:', error);
        throw error;
      }
    }
    // $provider_id: String, provider_name: String, bpp_id: String, bpp_uri: String
    // provider_id: $provider_id, provider_name: $provider_name, bpp_id: $bpp_id, bpp_uri: $bpp_uri
    const query = `mutation MyMutation($title: String, $description: String, $url: String, $provider_name: String, $enrollmentEndDate: timestamptz, $bpp_id: String, $unique_id: String, $bpp_uri: String, $item_id: String, $offeringInstitute: jsonb, $credits: String, $instructors: String,$provider_id: String, $item: json, $descriptor: json, $categories: json, $fulfillments: json) { 
            insert_${this.cache_db}(objects: {title: $title, description: $description, url: $url, provider_name: $provider_name, enrollmentEndDate: $enrollmentEndDate, bpp_id: $bpp_id, unique_id: $unique_id, bpp_uri: $bpp_uri, item_id: $item_id, offeringInstitute: $offeringInstitute credits: $credits, instructors: $instructors, provider_id:$provider_id, item: $item, descriptor: $descriptor, categories: $categories, fulfillments: $fulfillments}) {
            returning {
              item_id
              unique_id
            }
          }
        }
        `;

    let insertApiRes = [];
    for (const item of arrayOfObjects) {
      try {
        const insertResult = await this.queryDb(query, item);
        if (insertResult.errors) {
          insertApiRes.push({ error: insertResult.errors, item_id: item.item_id });
        } else {
          insertApiRes.push(insertResult);
        }
      } catch (error) {

        insertApiRes.push({ error: error.message, item_id: item.item_id });
      }
    }

    this.logger.log(`Cache refresh completed: inserted ${insertApiRes.length} records`);
    return insertApiRes;
  }

  async queryDb(query: string, variables?: Record<string, any>): Promise<any> {
    try {
      const response = await axios.post(
        this.url,
        {
          query,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecretKey,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log('error', error);
      return error;
    }
  }

  async getState() {
    const query = `query MyQuery {
            ${this.cache_db}(distinct_on: state,where: { state: { _neq: "" } }) {
              state
            }
          }
        `;

    try {
      return await this.queryDb(query);
    } catch (error) {
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  async getCity(state: string) {
    const query = `query MyQuery {
            ${this.cache_db}(distinct_on: city, where: {state: {_eq: "${state}"}}) {
              city
            }
          }
        `;

    try {
      return await this.queryDb(query);
    } catch (error) {
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  async getTitle() {
    const query = `query MyQuery {
            ${this.cache_db}(distinct_on: title) {
              title
            }
          }
        `;

    try {
      return await this.queryDb(query);
    } catch (error) {
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  async deleteResponse() {
    const query = `mutation MyMutation {
            delete_${this.response_cache_db}(where: {}) {
              affected_rows
            }
          }
        `;

    try {
      return await this.queryDb(query);
    } catch (error) {
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  async deleteJobs() {
    const query = `mutation MyMutation {
            delete_${this.cache_db}(where: {}) {
              affected_rows
            }
          }
        `;
    try {
      const result = await this.queryDb(query);
      this.logger.log(`Deleted ${result.data.delete_ubi_network_cache.affected_rows} records from cache`);
      return result;
    } catch (error) {
      this.logger.error('Error deleting all jobs:', error);
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }
  async deleteJobsByBpps(bpps: string[]) {
    // Build the _in clause for the query with the array of BPP IDs
    const validBpps = bpps.filter((bpp) => bpp != null && bpp !== '');
    if (validBpps.length === 0) {
      this.logger.warn('All provided BPP IDs were invalid');
      return { data: { [`delete_${this.cache_db}`]: { affected_rows: 0 } } };
    }

    const query = `mutation DeleteJobsByBpps($bppIds: [String!]!) {
		delete_${this.cache_db}(where: {bpp_id: {_in: $bppIds}}) {
			affected_rows
		}
	}`;
    try {
      const result = await this.queryDb(query, { bppIds: validBpps });
      const affectedRows = result.data[`delete_${this.cache_db}`].affected_rows;
      this.logger.log(
        `Deleted ${affectedRows} records for BPPs: ${validBpps.join(', ')}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error deleting jobs for BPPs [${validBpps.join(', ')}]:`,
        error,
      );
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  async createSeekerUser(seeker) {
    const query = `mutation InsertSeeker($email: String , $name:String, $age:String, $gender:String, $phone:String) {
     insert_${this.seeker_db}(objects: {email: $email, name: $name ,age: $age, gender: $gender, phone: $phone}) {
        affected_rows
        returning {
          id
          email
          name
          gender
          age
          phone
        } 
      }
    }`;

    // Rest of your code to execute the query
    try {
      const response = await this.queryDb(query, seeker);
      return response.data[`insert_${this.seeker_db}`].returning[0];
    } catch (error) {
      throw new HttpException(
        'Unable to create Seeker user',
        HttpStatus.BAD_REQUEST,
      );
    }

  }

  async findSeekerUser(email) {
    const query = `query MyQuery {
      ${this.seeker_db}(where: {email: {_eq: "${email}"}}) {
        id
        name
        email
        phone
      }
    }
    `;
    // Rest of your code to execute the query
    try {
      const response = await this.queryDb(query);
      return response.data[`${this.seeker_db}`][0];
    } catch (error) {
      throw new HttpException(
        'Unabe to create order user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createOrder(order) {
    const query = `mutation InsertOrder($content_id: String, $seeker_id: Int, $order_id: String) {
      insert_${this.order_db}(objects: {content_id: $content_id, seeker_id: $seeker_id, order_id: $order_id}) {
        affected_rows
        returning {
          content_id
          id
          order_id
          seeker_id
        }
      }
    }
    `;
    try {
      const response = await this.queryDb(query, order);
      return response;
    } catch (error) {
      throw new HttpException(
        'Unable to create order user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async searchOrderByOrderId(order) {
    const query = `query MyQuery {
      ${this.order_db}(where: {order_id: {_eq: "${order}"}}) {
        OrderContentRelationship {
          bpp_id
          bpp_uri
          id
          provider_id
          provider_name
         
        }
      }
    }
    `;
    try {
      const response = await this.queryDb(query);
      return response.data[`${this.order_db}`][0].OrderContentRelationship[0];
    } catch (error) {
      throw new HttpException('Invalid order id', HttpStatus.BAD_REQUEST);
    }

  }

  async addTelemetry(data) {
    const query = `
      mutation ($id: String, $ver: String, $events:jsonb) {
        insert_${this.telemetry_db}(objects: [{id: $id, ver: $ver, events: $events}]) {
          returning {
            id
            events
          }
        }
      }
    `;
    try {
      const response = await this.queryDb(query, data);
      return response;
    } catch (error) {
      throw new HttpException('Unable to add telemetry', HttpStatus.BAD_REQUEST);
    }
  }


}