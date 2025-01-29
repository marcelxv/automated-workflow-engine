# FoodReady Workflow Engine (AWE)

Centralized system for managing, validating, and deploying Orkes Conductor workflows. This repository serves as the single source of truth for all workflow definitions and their associated schemas.

## 📁 Repository Structure
```
.
├── workflows/                 # Workflow definitions
│   ├── workflowName.json     # Main workflow definition
│   ├── workflowName_schema.json  # Schema definition
│   └── workflowName_payload.json # Test payload
├── scripts/
│   ├── validate-workflows.js  # Validation script
│   └── schemaInjector.js     # Schema injection utility
└── .github/
    └── workflows/
        └── main.yml            # CI/CD pipeline
```

## 🚀 Quick Start

1. **Create New Workflow**
```bash
# Create workflow files
touch workflows/myWorkflow.json
touch workflows/myWorkflow_schema.json
touch workflows/myWorkflow_payload.json
```

2. **Validate Locally**
```bash
npm install
npm run validate
```

3. **Test Changes**
```bash
# Watch mode for development
npm run validate:watch
```

## 📋 File Requirements

### Workflow Definition (workflowName.json)
```json
{
  "name": "workflowName",
  "version": 1,
  "tasks": [...],
  "inputSchema": {
    "name": "workflowName_schema",
    "type": "JSON"
  }
}
```

### Schema Definition (workflowName_schema.json)
```json
{
  "name": "workflowName_schema",
  "version": 1,
  "type": "JSON",
  "data": {
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {...}
  }
}
```

## 🔄 Development Workflow

1. **Feature Development**
   - Create feature branch from main
   - Develop and test locally
   - Create PR to main

2. **Validation**
   - Automated validation on PR
   - Schema validation
   - Workflow structure validation
   - Input/output validation

3. **Deployment**
   - Automatic deployment on merge to main
   - Schema injection
   - Version validation
   - Deployment confirmation

## ⚙️ Configuration

Required environment variables:
- `ORKES_REPO_KEY`: Orkes API Key
- `ORKES_REPO_SECRET`: Orkes API Secret

## 🛠️ Commands

```bash
# Install dependencies
npm install

# Run validation
npm run validate

# Watch mode
npm run validate:watch

# Pre-commit hook
npm run precommit
```

## 🚨 Error Handling

Common errors and solutions:
1. Schema validation failures
2. Workflow structure issues
3. Deployment conflicts

## 📚 Documentation

- [Development Guide](docs/development.md)
- [Validation Rules](docs/validation.md)
- [Deployment Process](docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run validation
5. Create PR

## 📝 License

Proprietary - FoodReady, Inc.