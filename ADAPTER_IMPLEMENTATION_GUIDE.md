# Document Processing Service - Adapter-Based Implementation Guide

## Overview

This guide provides a **generic, adapter-based architecture** for building a document processing service that can:
- Extract text from documents using **any OCR provider** (AWS Textract, Google Vision, Azure, Tesseract, etc.)
- Map extracted data to schemas using **any AI provider** (AWS Bedrock, OpenAI, Google Gemini, Anthropic, etc.)
- Easily swap providers without changing business logic
- Reuse in any Node.js/NestJS project

---

## Architecture Principles

### 1. **Separation of Concerns**
- **Interfaces**: Define contracts for extractors and mappers
- **Adapters**: Implement specific providers (AWS, Google, OpenAI, etc.)
- **Services**: Orchestrate business logic using interfaces
- **Controllers**: Handle HTTP requests (optional, can be library)

### 2. **Dependency Inversion**
- Services depend on **interfaces**, not concrete implementations
- Adapters can be swapped via configuration
- New providers can be added without touching existing code

### 3. **Provider Independence**
- Each adapter is self-contained
- Configuration-driven provider selection
- Graceful fallbacks and error handling

---

## Core Interfaces

### 1. Text Extraction Interface

```typescript
// interfaces/text-extractor.interface.ts

export interface ExtractedText {
  fullText: string;
  confidence?: number;
  metadata?: {
    pageCount?: number;
    language?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

export interface TextExtractorConfig {
  provider: string;
  credentials?: any;
  options?: any;
}

export interface ITextExtractor {
  /**
   * Extract text from a document
   * @param fileBuffer - Document buffer (image, PDF, etc.)
   * @param mimeType - MIME type of the document
   * @returns Extracted text with metadata
   */
  extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText>;

  /**
   * Check if the provider supports this file type
   */
  supportsFileType(mimeType: string): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
```

### 2. AI Mapping Interface

```typescript
// interfaces/ai-mapper.interface.ts

export interface MappingResult<T = any> {
  data: T;
  confidence?: number;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    [key: string]: any;
  };
}

export interface AIMapperConfig {
  provider: string;
  model?: string;
  credentials?: any;
  options?: any;
}

export interface IAIMapper {
  /**
   * Map extracted text to a structured schema
   * @param extractedText - Text extracted from document
   * @param schema - Target schema (JSON object with expected fields)
   * @param context - Additional context or instructions
   * @returns Mapped data matching the schema
   */
  mapToSchema<T = any>(
    extractedText: string,
    schema: Record<string, any>,
    context?: string,
  ): Promise<MappingResult<T>>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Get model being used
   */
  getModel(): string;
}
```

---

## Adapter Implementations

### 1. AWS Textract Adapter

```typescript
// adapters/extractors/aws-textract.adapter.ts

import { ITextExtractor, ExtractedText } from '../../interfaces/text-extractor.interface';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

export class AWSTextractAdapter implements ITextExtractor {
  private client: TextractClient;

  constructor(config: { region: string; credentials?: any }) {
    this.client = new TextractClient({
      region: config.region,
      credentials: config.credentials,
    });
  }

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText> {
    const startTime = Date.now();
    
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: fileBuffer },
    });

    const response = await this.client.send(command);
    const fullText = response.Blocks
      ?.filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text)
      .join('\n') || '';

    return {
      fullText,
      confidence: this.calculateAverageConfidence(response.Blocks),
      metadata: {
        pageCount: 1,
        processingTime: Date.now() - startTime,
        provider: 'aws-textract',
      },
    };
  }

  supportsFileType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'application/pdf'].includes(mimeType);
  }

  getProviderName(): string {
    return 'aws-textract';
  }

  private calculateAverageConfidence(blocks: any[]): number {
    if (!blocks || blocks.length === 0) return 0;
    const confidences = blocks
      .filter((b) => b.Confidence)
      .map((b) => b.Confidence);
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }
}
```

### 2. Google Vision Adapter

```typescript
// adapters/extractors/google-vision.adapter.ts

import { ITextExtractor, ExtractedText } from '../../interfaces/text-extractor.interface';
import { ImageAnnotatorClient } from '@google-cloud/vision';

export class GoogleVisionAdapter implements ITextExtractor {
  private client: ImageAnnotatorClient;

  constructor(config: { keyFilename?: string; credentials?: any }) {
    this.client = new ImageAnnotatorClient(config);
  }

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText> {
    const startTime = Date.now();
    
    const [result] = await this.client.textDetection({
      image: { content: fileBuffer },
    });

    const fullText = result.textAnnotations?.[0]?.description || '';

    return {
      fullText,
      confidence: result.textAnnotations?.[0]?.confidence,
      metadata: {
        processingTime: Date.now() - startTime,
        provider: 'google-vision',
      },
    };
  }

  supportsFileType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType);
  }

  getProviderName(): string {
    return 'google-vision';
  }
}
```

### 3. Azure Computer Vision Adapter

```typescript
// adapters/extractors/azure-vision.adapter.ts

import { ITextExtractor, ExtractedText } from '../../interfaces/text-extractor.interface';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';

export class AzureVisionAdapter implements ITextExtractor {
  private client: ComputerVisionClient;

  constructor(config: { endpoint: string; apiKey: string }) {
    const credentials = new ApiKeyCredentials({
      inHeader: { 'Ocp-Apim-Subscription-Key': config.apiKey },
    });
    this.client = new ComputerVisionClient(credentials, config.endpoint);
  }

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText> {
    const startTime = Date.now();
    
    const result = await this.client.readInStream(fileBuffer);
    const operationId = result.operationLocation.split('/').pop();

    // Poll for result
    let readResult;
    while (true) {
      readResult = await this.client.getReadResult(operationId);
      if (readResult.status !== 'running' && readResult.status !== 'notStarted') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const fullText = readResult.analyzeResult.readResults
      .map(page => page.lines.map(line => line.text).join('\n'))
      .join('\n\n');

    return {
      fullText,
      metadata: {
        pageCount: readResult.analyzeResult.readResults.length,
        processingTime: Date.now() - startTime,
        provider: 'azure-vision',
      },
    };
  }

  supportsFileType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'application/pdf'].includes(mimeType);
  }

  getProviderName(): string {
    return 'azure-vision';
  }
}
```

### 4. AWS Bedrock Mapper Adapter

```typescript
// adapters/mappers/aws-bedrock.adapter.ts

import { IAIMapper, MappingResult } from '../../interfaces/ai-mapper.interface';
import { ChatBedrock } from '@langchain/community/chat_models/bedrock';

export class AWSBedrockAdapter implements IAIMapper {
  private model: ChatBedrock;
  private modelId: string;

  constructor(config: {
    region: string;
    credentials?: any;
    modelId?: string;
  }) {
    this.modelId = config.modelId || 'anthropic.claude-3-haiku-20240307-v1:0';
    
    this.model = new ChatBedrock({
      region: config.region,
      credentials: config.credentials,
      model: this.modelId,
      temperature: 0,
    });
  }

  async mapToSchema<T = any>(
    extractedText: string,
    schema: Record<string, any>,
    context?: string,
  ): Promise<MappingResult<T>> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(extractedText, schema, context);
    
    const response = await this.model.invoke(prompt);
    const content = response.content.toString();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      data,
      metadata: {
        model: this.modelId,
        processingTime: Date.now() - startTime,
        provider: 'aws-bedrock',
      },
    };
  }

  getProviderName(): string {
    return 'aws-bedrock';
  }

  getModel(): string {
    return this.modelId;
  }

  private buildPrompt(text: string, schema: Record<string, any>, context?: string): string {
    return `You are a data extraction assistant. Extract information from the provided text and map it to the given JSON schema.

${context ? `Context: ${context}\n\n` : ''}
Text to extract from:
${text}

Target JSON Schema:
${JSON.stringify(schema, null, 2)}

Instructions:
1. Extract values that match the schema fields
2. Return ONLY valid JSON matching the schema structure
3. Use null for missing values
4. Infer data types from schema (numbers as numbers, strings as strings)
5. Do not include any explanation, only return the JSON

Response:`;
  }
}
```

### 5. OpenAI Mapper Adapter

```typescript
// adapters/mappers/openai.adapter.ts

import { IAIMapper, MappingResult } from '../../interfaces/ai-mapper.interface';
import OpenAI from 'openai';

export class OpenAIAdapter implements IAIMapper {
  private client: OpenAI;
  private model: string;

  constructor(config: {
    apiKey: string;
    model?: string;
  }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4-turbo-preview';
  }

  async mapToSchema<T = any>(
    extractedText: string,
    schema: Record<string, any>,
    context?: string,
  ): Promise<MappingResult<T>> {
    const startTime = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction assistant. Extract information and return valid JSON matching the provided schema.',
        },
        {
          role: 'user',
          content: this.buildPrompt(extractedText, schema, context),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const data = JSON.parse(response.choices[0].message.content);

    return {
      data,
      metadata: {
        model: this.model,
        tokensUsed: response.usage.total_tokens,
        processingTime: Date.now() - startTime,
        provider: 'openai',
      },
    };
  }

  getProviderName(): string {
    return 'openai';
  }

  getModel(): string {
    return this.model;
  }

  private buildPrompt(text: string, schema: Record<string, any>, context?: string): string {
    return `${context ? `Context: ${context}\n\n` : ''}Extract data from this text:

${text}

Map to this schema:
${JSON.stringify(schema, null, 2)}

Return valid JSON matching the schema. Use null for missing values.`;
  }
}
```

### 6. Google Gemini Mapper Adapter

```typescript
// adapters/mappers/google-gemini.adapter.ts

import { IAIMapper, MappingResult } from '../../interfaces/ai-mapper.interface';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GoogleGeminiAdapter implements IAIMapper {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: {
    apiKey: string;
    model?: string;
  }) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-pro';
  }

  async mapToSchema<T = any>(
    extractedText: string,
    schema: Record<string, any>,
    context?: string,
  ): Promise<MappingResult<T>> {
    const startTime = Date.now();

    const generativeModel = this.client.getGenerativeModel({ model: this.model });
    
    const prompt = this.buildPrompt(extractedText, schema, context);
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      data,
      metadata: {
        model: this.model,
        processingTime: Date.now() - startTime,
        provider: 'google-gemini',
      },
    };
  }

  getProviderName(): string {
    return 'google-gemini';
  }

  getModel(): string {
    return this.model;
  }

  private buildPrompt(text: string, schema: Record<string, any>, context?: string): string {
    return `You are a data extraction assistant. Extract information from the text and map it to the JSON schema.

${context ? `Context: ${context}\n\n` : ''}
Text:
${text}

Schema:
${JSON.stringify(schema, null, 2)}

Return ONLY valid JSON matching the schema. Use null for missing values.`;
  }
}
```

---

## Factory Pattern for Provider Selection

```typescript
// factories/text-extractor.factory.ts

import { ITextExtractor } from '../interfaces/text-extractor.interface';
import { AWSTextractAdapter } from '../adapters/extractors/aws-textract.adapter';
import { GoogleVisionAdapter } from '../adapters/extractors/google-vision.adapter';
import { AzureVisionAdapter } from '../adapters/extractors/azure-vision.adapter';

export class TextExtractorFactory {
  static create(provider: string, config: any): ITextExtractor {
    switch (provider.toLowerCase()) {
      case 'aws-textract':
        return new AWSTextractAdapter(config);
      
      case 'google-vision':
        return new GoogleVisionAdapter(config);
      
      case 'azure-vision':
        return new AzureVisionAdapter(config);
      
      // Add more providers here
      
      default:
        throw new Error(`Unsupported text extraction provider: ${provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['aws-textract', 'google-vision', 'azure-vision'];
  }
}
```

```typescript
// factories/ai-mapper.factory.ts

import { IAIMapper } from '../interfaces/ai-mapper.interface';
import { AWSBedrockAdapter } from '../adapters/mappers/aws-bedrock.adapter';
import { OpenAIAdapter } from '../adapters/mappers/openai.adapter';
import { GoogleGeminiAdapter } from '../adapters/mappers/google-gemini.adapter';

export class AIMapperFactory {
  static create(provider: string, config: any): IAIMapper {
    switch (provider.toLowerCase()) {
      case 'aws-bedrock':
        return new AWSBedrockAdapter(config);
      
      case 'openai':
        return new OpenAIAdapter(config);
      
      case 'google-gemini':
        return new GoogleGeminiAdapter(config);
      
      // Add more providers here
      
      default:
        throw new Error(`Unsupported AI mapping provider: ${provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['aws-bedrock', 'openai', 'google-gemini'];
  }
}
```

---

## Generic Document Processing Service

```typescript
// services/document-processor.service.ts

import { ITextExtractor } from '../interfaces/text-extractor.interface';
import { IAIMapper } from '../interfaces/ai-mapper.interface';

export interface ProcessingResult<T = any> {
  extractedText: string;
  mappedData: T;
  metadata: {
    extractor: string;
    mapper: string;
    totalProcessingTime: number;
  };
}

export class DocumentProcessorService {
  constructor(
    private textExtractor: ITextExtractor,
    private aiMapper: IAIMapper,
  ) {}

  /**
   * Process a document: extract text and map to schema
   */
  async processDocument<T = any>(
    fileBuffer: Buffer,
    mimeType: string,
    schema: Record<string, any>,
    context?: string,
  ): Promise<ProcessingResult<T>> {
    const startTime = Date.now();

    // Step 1: Extract text
    const extractionResult = await this.textExtractor.extractText(fileBuffer, mimeType);

    // Step 2: Map to schema
    const mappingResult = await this.aiMapper.mapToSchema<T>(
      extractionResult.fullText,
      schema,
      context,
    );

    return {
      extractedText: extractionResult.fullText,
      mappedData: mappingResult.data,
      metadata: {
        extractor: this.textExtractor.getProviderName(),
        mapper: this.aiMapper.getProviderName(),
        totalProcessingTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Extract text only (no mapping)
   */
  async extractTextOnly(fileBuffer: Buffer, mimeType: string) {
    return this.textExtractor.extractText(fileBuffer, mimeType);
  }

  /**
   * Map already extracted text to schema
   */
  async mapTextToSchema<T = any>(
    text: string,
    schema: Record<string, any>,
    context?: string,
  ) {
    return this.aiMapper.mapToSchema<T>(text, schema, context);
  }
}
```

---

## Configuration Management

```typescript
// config/document-processor.config.ts

export interface DocumentProcessorConfig {
  textExtractor: {
    provider: 'aws-textract' | 'google-vision' | 'azure-vision';
    config: any;
  };
  aiMapper: {
    provider: 'aws-bedrock' | 'openai' | 'google-gemini';
    config: any;
  };
  fallback?: {
    enabled: boolean;
    textExtractor?: {
      provider: string;
      config: any;
    };
    aiMapper?: {
      provider: string;
      config: any;
    };
  };
}

// Example configurations

export const awsConfig: DocumentProcessorConfig = {
  textExtractor: {
    provider: 'aws-textract',
    config: {
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
    },
  },
  aiMapper: {
    provider: 'aws-bedrock',
    config: {
      region: process.env.BEDROCK_REGION,
      credentials: {
        accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID,
        secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY,
      },
      modelId: process.env.BEDROCK_MODEL_ID,
    },
  },
};

export const googleConfig: DocumentProcessorConfig = {
  textExtractor: {
    provider: 'google-vision',
    config: {
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  },
  aiMapper: {
    provider: 'google-gemini',
    config: {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: 'gemini-pro',
    },
  },
};

export const hybridConfig: DocumentProcessorConfig = {
  textExtractor: {
    provider: 'aws-textract',
    config: {
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
    },
  },
  aiMapper: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview',
    },
  },
  fallback: {
    enabled: true,
    aiMapper: {
      provider: 'google-gemini',
      config: {
        apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      },
    },
  },
};
```

---

## NestJS Module Implementation

```typescript
// document-processor.module.ts

import { Module, DynamicModule, Global } from '@nestjs/common';
import { DocumentProcessorService } from './services/document-processor.service';
import { TextExtractorFactory } from './factories/text-extractor.factory';
import { AIMapperFactory } from './factories/ai-mapper.factory';
import { DocumentProcessorConfig } from './config/document-processor.config';

export const DOCUMENT_PROCESSOR_CONFIG = 'DOCUMENT_PROCESSOR_CONFIG';

@Global()
@Module({})
export class DocumentProcessorModule {
  static forRoot(config: DocumentProcessorConfig): DynamicModule {
    return {
      module: DocumentProcessorModule,
      providers: [
        {
          provide: DOCUMENT_PROCESSOR_CONFIG,
          useValue: config,
        },
        {
          provide: 'TEXT_EXTRACTOR',
          useFactory: () => {
            return TextExtractorFactory.create(
              config.textExtractor.provider,
              config.textExtractor.config,
            );
          },
        },
        {
          provide: 'AI_MAPPER',
          useFactory: () => {
            return AIMapperFactory.create(
              config.aiMapper.provider,
              config.aiMapper.config,
            );
          },
        },
        {
          provide: DocumentProcessorService,
          useFactory: (textExtractor, aiMapper) => {
            return new DocumentProcessorService(textExtractor, aiMapper);
          },
          inject: ['TEXT_EXTRACTOR', 'AI_MAPPER'],
        },
      ],
      exports: [DocumentProcessorService, DOCUMENT_PROCESSOR_CONFIG],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<DocumentProcessorConfig> | DocumentProcessorConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: DocumentProcessorModule,
      providers: [
        {
          provide: DOCUMENT_PROCESSOR_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'TEXT_EXTRACTOR',
          useFactory: (config: DocumentProcessorConfig) => {
            return TextExtractorFactory.create(
              config.textExtractor.provider,
              config.textExtractor.config,
            );
          },
          inject: [DOCUMENT_PROCESSOR_CONFIG],
        },
        {
          provide: 'AI_MAPPER',
          useFactory: (config: DocumentProcessorConfig) => {
            return AIMapperFactory.create(
              config.aiMapper.provider,
              config.aiMapper.config,
            );
          },
          inject: [DOCUMENT_PROCESSOR_CONFIG],
        },
        {
          provide: DocumentProcessorService,
          useFactory: (textExtractor, aiMapper) => {
            return new DocumentProcessorService(textExtractor, aiMapper);
          },
          inject: ['TEXT_EXTRACTOR', 'AI_MAPPER'],
        },
      ],
      exports: [DocumentProcessorService, DOCUMENT_PROCESSOR_CONFIG],
    };
  }
}
```

---

## Usage Examples

### 1. Using in NestJS Application

```typescript
// app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DocumentProcessorModule } from './document-processor/document-processor.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    
    // Option 1: Simple configuration
    DocumentProcessorModule.forRoot({
      textExtractor: {
        provider: 'aws-textract',
        config: {
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'YOUR_KEY',
            secretAccessKey: 'YOUR_SECRET',
          },
        },
      },
      aiMapper: {
        provider: 'openai',
        config: {
          apiKey: 'YOUR_OPENAI_KEY',
          model: 'gpt-4-turbo-preview',
        },
      },
    }),

    // Option 2: Async configuration with ConfigService
    DocumentProcessorModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        textExtractor: {
          provider: configService.get('EXTRACTOR_PROVIDER') || 'aws-textract',
          config: {
            region: configService.get('AWS_S3_REGION'),
            credentials: {
              accessKeyId: configService.get('AWS_S3_ACCESS_KEY_ID'),
              secretAccessKey: configService.get('AWS_S3_SECRET_ACCESS_KEY'),
            },
          },
        },
        aiMapper: {
          provider: configService.get('MAPPER_PROVIDER') || 'openai',
          config: {
            apiKey: configService.get('OPENAI_API_KEY'),
            model: configService.get('AI_MODEL'),
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. Using in a Controller

```typescript
// documents.controller.ts

import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentProcessorService } from './document-processor/services/document-processor.service';

@Controller('documents')
export class DocumentsController {
  constructor(private documentProcessor: DocumentProcessorService) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('file'))
  async processDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('schema') schemaJson: string,
    @Body('context') context?: string,
  ) {
    const schema = JSON.parse(schemaJson);
    
    const result = await this.documentProcessor.processDocument(
      file.buffer,
      file.mimetype,
      schema,
      context,
    );

    return {
      success: true,
      data: result.mappedData,
      extractedText: result.extractedText,
      metadata: result.metadata,
    };
  }

  @Post('extract-only')
  @UseInterceptors(FileInterceptor('file'))
  async extractText(@UploadedFile() file: Express.Multer.File) {
    const result = await this.documentProcessor.extractTextOnly(
      file.buffer,
      file.mimetype,
    );

    return {
      success: true,
      text: result.fullText,
      metadata: result.metadata,
    };
  }
}
```

### 3. Using as Standalone Library

```typescript
// standalone-usage.ts

import { TextExtractorFactory } from './factories/text-extractor.factory';
import { AIMapperFactory } from './factories/ai-mapper.factory';
import { DocumentProcessorService } from './services/document-processor.service';
import * as fs from 'fs';

async function main() {
  // Create providers
  const textExtractor = TextExtractorFactory.create('aws-textract', {
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'YOUR_KEY',
      secretAccessKey: 'YOUR_SECRET',
    },
  });

  const aiMapper = AIMapperFactory.create('openai', {
    apiKey: 'YOUR_OPENAI_KEY',
    model: 'gpt-4-turbo-preview',
  });

  // Create service
  const processor = new DocumentProcessorService(textExtractor, aiMapper);

  // Process document
  const fileBuffer = fs.readFileSync('./invoice.pdf');
  const schema = {
    invoice_number: '',
    date: '',
    total_amount: null,
    vendor_name: '',
  };

  const result = await processor.processDocument(
    fileBuffer,
    'application/pdf',
    schema,
    'This is an invoice document',
  );

  console.log('Mapped Data:', result.mappedData);
  console.log('Metadata:', result.metadata);
}

main();
```

### 4. Switching Providers at Runtime

```typescript
// dynamic-provider-switching.ts

import { Injectable } from '@nestjs/common';
import { TextExtractorFactory } from './factories/text-extractor.factory';
import { AIMapperFactory } from './factories/ai-mapper.factory';
import { DocumentProcessorService } from './services/document-processor.service';

@Injectable()
export class DynamicProcessorService {
  createProcessor(extractorProvider: string, mapperProvider: string) {
    // Create providers based on user selection or configuration
    const textExtractor = TextExtractorFactory.create(extractorProvider, {
      // Get config from environment or database
      ...this.getExtractorConfig(extractorProvider),
    });

    const aiMapper = AIMapperFactory.create(mapperProvider, {
      // Get config from environment or database
      ...this.getMapperConfig(mapperProvider),
    });

    return new DocumentProcessorService(textExtractor, aiMapper);
  }

  async processWithProviders(
    file: Buffer,
    mimeType: string,
    schema: any,
    extractorProvider: string,
    mapperProvider: string,
  ) {
    const processor = this.createProcessor(extractorProvider, mapperProvider);
    return processor.processDocument(file, mimeType, schema);
  }

  private getExtractorConfig(provider: string) {
    // Load config from environment, database, or config service
    switch (provider) {
      case 'aws-textract':
        return {
          region: process.env.AWS_S3_REGION,
          credentials: {
            accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
          },
        };
      case 'google-vision':
        return {
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        };
      // Add more cases
    }
  }

  private getMapperConfig(provider: string) {
    // Load config from environment, database, or config service
    switch (provider) {
      case 'openai':
        return {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        };
      case 'google-gemini':
        return {
          apiKey: process.env.GOOGLE_GEMINI_API_KEY,
        };
      // Add more cases
    }
  }
}
```

---

## Environment Variables Template

```bash
# .env.example

# ==========================================
# Text Extraction Provider Configuration
# ==========================================

# Choose one: aws-textract, google-vision, azure-vision
EXTRACTOR_PROVIDER=aws-textract

# AWS Textract
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your_aws_key
AWS_S3_SECRET_ACCESS_KEY=your_aws_secret

# Google Vision
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Azure Computer Vision
AZURE_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_VISION_API_KEY=your_azure_key

# ==========================================
# AI Mapping Provider Configuration
# ==========================================

# Choose one: aws-bedrock, openai, google-gemini
MAPPER_PROVIDER=openai

# AWS Bedrock
BEDROCK_REGION=us-east-1
BEDROCK_ACCESS_KEY_ID=your_bedrock_key
BEDROCK_SECRET_ACCESS_KEY=your_bedrock_secret
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4-turbo-preview

# Google Gemini
GOOGLE_GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-pro

# Anthropic (Direct)
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-opus-20240229

# ==========================================
# Application Configuration
# ==========================================

PORT=3001
NODE_ENV=development
```

---

## Testing Strategy

### Unit Tests for Adapters

```typescript
// adapters/extractors/__tests__/aws-textract.adapter.spec.ts

import { AWSTextractAdapter } from '../aws-textract.adapter';
import { TextractClient } from '@aws-sdk/client-textract';

jest.mock('@aws-sdk/client-textract');

describe('AWSTextractAdapter', () => {
  let adapter: AWSTextractAdapter;

  beforeEach(() => {
    adapter = new AWSTextractAdapter({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      },
    });
  });

  it('should extract text from image', async () => {
    const mockResponse = {
      Blocks: [
        { BlockType: 'LINE', Text: 'Line 1', Confidence: 99 },
        { BlockType: 'LINE', Text: 'Line 2', Confidence: 98 },
      ],
    };

    (TextractClient.prototype.send as jest.Mock).mockResolvedValue(mockResponse);

    const buffer = Buffer.from('fake-image');
    const result = await adapter.extractText(buffer, 'image/jpeg');

    expect(result.fullText).toBe('Line 1\nLine 2');
    expect(result.confidence).toBeCloseTo(98.5);
  });

  it('should support correct file types', () => {
    expect(adapter.supportsFileType('image/jpeg')).toBe(true);
    expect(adapter.supportsFileType('image/png')).toBe(true);
    expect(adapter.supportsFileType('application/pdf')).toBe(true);
    expect(adapter.supportsFileType('image/gif')).toBe(false);
  });
});
```

### Integration Tests

```typescript
// services/__tests__/document-processor.integration.spec.ts

import { DocumentProcessorService } from '../document-processor.service';
import { TextExtractorFactory } from '../../factories/text-extractor.factory';
import { AIMapperFactory } from '../../factories/ai-mapper.factory';
import * as fs from 'fs';

describe('DocumentProcessorService Integration', () => {
  let service: DocumentProcessorService;

  beforeAll(() => {
    const textExtractor = TextExtractorFactory.create('aws-textract', {
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
    });

    const aiMapper = AIMapperFactory.create('openai', {
      apiKey: process.env.OPENAI_API_KEY,
    });

    service = new DocumentProcessorService(textExtractor, aiMapper);
  });

  it('should process document end-to-end', async () => {
    const fileBuffer = fs.readFileSync('./test-fixtures/sample-invoice.pdf');
    const schema = {
      invoice_number: '',
      total_amount: null,
    };

    const result = await service.processDocument(
      fileBuffer,
      'application/pdf',
      schema,
    );

    expect(result.mappedData).toHaveProperty('invoice_number');
    expect(result.mappedData).toHaveProperty('total_amount');
    expect(result.metadata.extractor).toBe('aws-textract');
    expect(result.metadata.mapper).toBe('openai');
  }, 30000);
});
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    
    // AWS SDK
    "@aws-sdk/client-textract": "^3.450.0",
    "@langchain/community": "^0.0.20",
    
    // Google Cloud
    "@google-cloud/vision": "^4.0.0",
    "@google/generative-ai": "^0.1.0",
    
    // Azure
    "@azure/cognitiveservices-computervision": "^8.2.0",
    "@azure/ms-rest-js": "^2.6.0",
    
    // OpenAI
    "openai": "^4.20.0",
    
    // Anthropic
    "@anthropic-ai/sdk": "^0.9.0",
    
    // Utilities
    "multer": "^1.4.5-lts.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.1.3"
  }
}
```

---

## Migration from Current Project

### Step 1: Create New Structure

```bash
mkdir -p src/document-processor/{interfaces,adapters/{extractors,mappers},factories,services,config}
```

### Step 2: Move Existing Code to Adapters

1. **Move TextractService** → `adapters/extractors/aws-textract.adapter.ts`
2. **Move BedrockService** → `adapters/mappers/aws-bedrock.adapter.ts`
3. **Implement interfaces** in both adapters

### Step 3: Update ExtractService

```typescript
// Before (tightly coupled)
constructor(
  private textractService: TextractService,
  private bedrockService: BedrockService,
) {}

// After (interface-based)
constructor(
  @Inject('TEXT_EXTRACTOR') private textExtractor: ITextExtractor,
  @Inject('AI_MAPPER') private aiMapper: IAIMapper,
) {}
```

### Step 4: Update Module

Replace current module with `DocumentProcessorModule.forRoot()` or `forRootAsync()`.

### Step 5: Test

Run existing tests to ensure backward compatibility.

---

## Adding New Providers

### Example: Adding Tesseract OCR

```typescript
// adapters/extractors/tesseract.adapter.ts

import { ITextExtractor, ExtractedText } from '../../interfaces/text-extractor.interface';
import Tesseract from 'tesseract.js';

export class TesseractAdapter implements ITextExtractor {
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText> {
    const { data } = await Tesseract.recognize(fileBuffer, 'eng');
    
    return {
      fullText: data.text,
      confidence: data.confidence,
      metadata: {
        provider: 'tesseract',
      },
    };
  }

  supportsFileType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png'].includes(mimeType);
  }

  getProviderName(): string {
    return 'tesseract';
  }
}
```

Update factory:

```typescript
// factories/text-extractor.factory.ts

case 'tesseract':
  return new TesseractAdapter(config);
```

That's it! No other code changes needed.

---

## Best Practices

### 1. **Configuration Management**
- Use environment variables for credentials
- Support multiple configuration sources (env, files, secrets manager)
- Validate configuration on startup

### 2. **Error Handling**
- Implement retry logic with exponential backoff
- Provide meaningful error messages
- Log errors with context

### 3. **Performance**
- Cache provider instances
- Use connection pooling where applicable
- Implement timeouts

### 4. **Security**
- Never commit credentials
- Use IAM roles in production
- Rotate keys regularly
- Validate file uploads

### 5. **Monitoring**
- Log provider usage and costs
- Track processing times
- Monitor error rates
- Set up alerts

---

## Production Considerations

### 1. **Cost Optimization**
- Choose appropriate models (Haiku vs Sonnet vs Opus)
- Implement caching for repeated documents
- Use cheaper providers for simple tasks

### 2. **Scalability**
- Use queue-based processing for large volumes
- Implement rate limiting
- Consider serverless deployment

### 3. **Reliability**
- Implement circuit breakers
- Use fallback providers
- Set up health checks

### 4. **Compliance**
- Ensure GDPR/HIPAA compliance
- Implement data retention policies
- Log all processing activities

---

## Conclusion

This adapter-based architecture provides:

✅ **Flexibility**: Swap providers without code changes  
✅ **Maintainability**: Clear separation of concerns  
✅ **Testability**: Easy to mock interfaces  
✅ **Extensibility**: Add new providers easily  
✅ **Reusability**: Use as a library in any project  
✅ **Independence**: No vendor lock-in  

You can now integrate this into any Node.js/NestJS project and switch between AWS, Google, Azure, OpenAI, or any other provider with just configuration changes!
