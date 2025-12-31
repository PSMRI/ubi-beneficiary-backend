# System Reference

This section explains how the Beneficiary Backend works internally.

## Overview

Unlike the **Backend Guide** (setup steps), this reference explains architecture, services, and technical decisions.

## Purpose

Use this reference to:
- 🧠 Understand internal architecture and design patterns
- 🔧 Make technical decisions (provider selection, configuration)
- 🐛 Debug and troubleshoot issues
- 📝 Extend or modify functionality

**Note:** You don't need to read this to run the system. The Backend Guide is sufficient for setup.

## Sections

### 📄 Document Processing
Learn how documents are processed through OCR, AI mapping, and cloud storage.

**Topics**: Service Adapters, OCR Processing, OCR Mapping, File Storage

### 🔐 Verifiable Credentials
Verifiable credential creation and management using Dhiway platform.

**Topics**: VC Processing Cron System

### ⚙️ Configuration
AI models, providers, and system configuration options.

**Topics**: AI Model Parameters, Bedrock Model Switching

## Architecture Principles

**🔌 Adapter Pattern** - Loose coupling between business logic and external providers

**🎯 Service Independence** - Each service works standalone or combined

**⚙️ Configuration-Driven** - Provider selection via environment variables

**🧪 Testable & Maintainable** - Mock external services easily
