# Automation Workflow Engine 

A comprehensive platform for creating, testing, validating, and managing workflow automations in the FoodReady ecosystem. Built on top of Orkes Conductor, this system provides end-to-end workflow management with robust development and deployment capabilities.

## Overview

AWE serves as the central hub for all workflow automation needs, enabling teams to:
- Develop and test workflows locally
- Validate workflow definitions against schemas
- Maintain version control of workflows
- Automate deployment to production
- Ensure consistency across the automation pipeline

## Features

### Development Lifecycle Management
- Local development environment setup
- Workflow validation framework
- Schema verification system
- Test payload management
- Worker function testing

### Quality Assurance
- Automated schema validation
- Input parameter verification
- Task reference checking
- Payload testing
- Worker function validation

### Deployment & Version Control
- Automated CI/CD pipeline
- Production deployment automation
- Version tracking
- Rollback capabilities
- Change history maintenance

### Workflow Management
- Centralized workflow repository
- Schema definition management
- Test case organization
- Worker function library
- Documentation generation

## Project Structure

```
.
├── workflows/                # Workflow definitions
│   ├── production/          # Production workflows
│   │   ├── workflow1.json
│   │   ├── workflow1_schema.json
│   │   └── workflow1_payload.json
│   └── development/         # Development workflows
├── workers/                 # Worker function definitions
├── schemas/                 # Schema templates
├── tests/                  # Test configurations
├── .github/
│   └── workflows/          # CI/CD configurations
└── scripts/                # Utility scripts
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Docker (for local testing)
- Git

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/foodready/awe.git
cd awe
```

2. Install dependencies:
```bash
npm install
```

3. Set up local environment:
```bash
cp .env.example .env
# Configure your environment variables
```

4. Create your first workflow:
```bash
npm run create-workflow myWorkflow
```

### Workflow Development

1. **Create Workflow Files**:
```
myWorkflow.json           # Workflow definition
myWorkflow_schema.json    # Schema definition
myWorkflow_payload.json   # Test payload
```

2. **Validate Locally**:
```bash
npm run validate ./workflows/myWorkflow.json
```

3. **Test Worker Functions**:
```bash
npm run test-worker ./workers/myWorker.js
```

### Deployment

1. **Automated Deployment**:
- Push to main branch triggers validation and deployment
- GitHub Actions handles the deployment pipeline

2. **Manual Deployment**:
```bash
npm run deploy-workflow myWorkflow
```

## Configuration

### Workflow Structure
```json
{
  "name": "workflowName",
  "version": 1,
  "tasks": [...],
  "inputParameters": [...],
  "outputParameters": {...}
}
```

### Schema Definition
```json
{
  "name": "workflowName_input",
  "version": 1,
  "type": "JSON",
  "data": {
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {...}
  }
}
```

## Development Guidelines

### Best Practices
1. Always include schema definitions
2. Provide test payloads
3. Document worker functions
4. Follow naming conventions
5. Include version information

### Version Control
- Use semantic versioning for workflows
- Include changelog entries
- Tag significant versions
- Document breaking changes

## Testing

### Local Testing
```bash
# Run validation tests
npm run test

# Test specific workflow
npm run test-workflow myWorkflow

# Test worker functions
npm run test-worker myWorker
```

### CI/CD Testing
- Automated tests run on pull requests
- Validation checks for schema compliance
- Worker function testing
- Integration testing

## Monitoring & Maintenance

### Version Tracking
- Track workflow versions in production
- Monitor execution statistics
- Track error rates and performance

### Troubleshooting
- Validation error resolution
- Schema compliance checking
- Worker function debugging
- Deployment issue resolution

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## Support

For internal support:
- Slack: #workflow-automation
- Documentation: [Internal Wiki Link]

## License

