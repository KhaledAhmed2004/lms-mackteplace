const fs = require('fs');
const path = require('path');

/**
 * Smart Postman Collection Generator
 *
 * Features:
 * - Auto-detects ALL modules from src/routes/index.ts
 * - Parses route files to extract endpoints
 * - Reads validation files to generate accurate request bodies
 * - Extracts JSDoc comments for descriptions
 * - Generates complete collection with all modules
 *
 * Usage:
 *   node scripts/generate-postman-collection.js           # Generate complete collection
 *   node scripts/generate-postman-collection.js auth      # Generate single module
 */

class SmartPostmanGenerator {
  constructor() {
    this.baseUrl = '{{BASE_URL}}';
    this.modulesPath = path.join(process.cwd(), 'src', 'app', 'modules');
    this.routesIndexPath = path.join(process.cwd(), 'src', 'routes', 'index.ts');
    this.outputDir = path.join(process.cwd(), 'postman-collections');
  }

  /**
   * Main entry point - generates complete collection
   */
  async generateCompleteCollection() {
    console.log('🚀 Starting Smart Postman Collection Generator...\n');

    // Step 1: Detect all modules from routes/index.ts
    const modules = this.detectModulesFromRoutes();
    console.log(`📦 Found ${modules.length} modules:\n`);
    modules.forEach(m => console.log(`   - ${m.name} → ${m.path}`));
    console.log('');

    // Step 2: Generate collection structure
    const collection = {
      info: {
        name: 'Complete API Collection',
        description: 'Auto-generated complete API collection with all modules',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: this.generateVariables(),
      event: this.generateCollectionEvents(),
    };

    // Step 3: Process each module
    for (const module of modules) {
      console.log(`📝 Processing: ${module.name}...`);
      try {
        const moduleFolder = this.parseModuleFolder(module);
        if (moduleFolder && moduleFolder.item.length > 0) {
          collection.item.push(moduleFolder);
          console.log(`   ✅ Added ${moduleFolder.item.length} endpoints`);
        } else {
          console.log(`   ⚠️  No endpoints found`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Step 4: Save collection
    this.ensureOutputDir();
    const outputPath = path.join(this.outputDir, 'complete-api-collection.json');
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`\n✅ Collection generated successfully!`);
    console.log(`📁 Saved to: postman-collections/complete-api-collection.json`);
    console.log(`📊 Total modules: ${collection.item.length}`);
    console.log(`📊 Total endpoints: ${collection.item.reduce((sum, m) => sum + m.item.length, 0)}`);
  }

  /**
   * Generate single module collection
   */
  async generateSingleModule(moduleName) {
    console.log(`🚀 Generating collection for module: ${moduleName}\n`);

    const modules = this.detectModulesFromRoutes();
    const module = modules.find(m => m.name.toLowerCase() === moduleName.toLowerCase());

    if (!module) {
      console.log(`❌ Module '${moduleName}' not found!`);
      console.log('\n📋 Available modules:');
      modules.forEach(m => console.log(`   - ${m.name}`));
      return;
    }

    const collection = {
      info: {
        name: `${this.capitalize(module.name)} API Collection`,
        description: `Auto-generated collection for ${module.name} module`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: this.generateVariables(),
      event: this.generateCollectionEvents(),
    };

    const moduleFolder = this.parseModuleFolder(module);
    if (moduleFolder) {
      collection.item = moduleFolder.item;
    }

    this.ensureOutputDir();
    const outputPath = path.join(this.outputDir, `${moduleName}-collection.json`);
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`✅ Collection generated: postman-collections/${moduleName}-collection.json`);
    console.log(`📊 Endpoints: ${collection.item.length}`);
  }

  /**
   * Detect modules from src/routes/index.ts
   */
  detectModulesFromRoutes() {
    const modules = [];

    if (!fs.existsSync(this.routesIndexPath)) {
      console.error('❌ Routes index file not found:', this.routesIndexPath);
      return modules;
    }

    const content = fs.readFileSync(this.routesIndexPath, 'utf8');

    // Parse apiRoutes array
    const apiRoutesMatch = content.match(/const\s+apiRoutes\s*=\s*\[([\s\S]*?)\];/);
    if (!apiRoutesMatch) {
      console.error('❌ Could not find apiRoutes array');
      return modules;
    }

    // Extract path and route entries
    const routeEntryRegex = /{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*route:\s*(\w+)/g;
    let match;

    while ((match = routeEntryRegex.exec(apiRoutesMatch[1])) !== null) {
      const apiPath = match[1];
      const routeName = match[2];

      // Find the import to get module folder name
      const importRegex = new RegExp(
        `import\\s*{\\s*${routeName}\\s*}\\s*from\\s*['"]([^'"]+)['"]`
      );
      const importMatch = content.match(importRegex);

      let moduleFolderName = '';
      if (importMatch) {
        // Extract folder name from import path
        const importPath = importMatch[1];
        const pathParts = importPath.split('/');
        // Get the folder name (second to last part)
        moduleFolderName = pathParts[pathParts.length - 2] || '';
      }

      modules.push({
        name: this.pathToModuleName(apiPath),
        path: apiPath,
        folderName: moduleFolderName,
        routeName: routeName,
      });
    }

    return modules;
  }

  /**
   * Parse a module folder and generate Postman folder
   */
  parseModuleFolder(module) {
    const modulePath = path.join(this.modulesPath, module.folderName);

    if (!fs.existsSync(modulePath)) {
      return null;
    }

    // Find route file
    const routeFile = this.findRouteFile(modulePath, module.folderName);
    if (!routeFile) {
      return null;
    }

    // Find validation file
    const validationFile = this.findValidationFile(modulePath, module.folderName);
    const validationSchemas = validationFile ? this.parseValidationFile(validationFile) : {};

    // Parse routes
    const endpoints = this.parseRouteFile(routeFile, module.path, validationSchemas);

    return {
      name: `${this.capitalize(module.name)} Module`,
      description: `${this.capitalize(module.name)} related endpoints`,
      item: endpoints,
    };
  }

  /**
   * Find route file in module folder
   */
  findRouteFile(modulePath, folderName) {
    const possibleNames = [
      `${folderName}.route.ts`,
      `${folderName}.routes.ts`,
      'route.ts',
      'routes.ts',
    ];

    for (const name of possibleNames) {
      const filePath = path.join(modulePath, name);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Find validation file in module folder
   */
  findValidationFile(modulePath, folderName) {
    const possibleNames = [
      `${folderName}.validation.ts`,
      'validation.ts',
    ];

    for (const name of possibleNames) {
      const filePath = path.join(modulePath, name);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Parse validation file to extract schemas
   */
  parseValidationFile(filePath) {
    const schemas = {};
    const content = fs.readFileSync(filePath, 'utf8');

    // Find all z.object definitions for body
    const schemaRegex = /const\s+(\w+)\s*=\s*z\.object\s*\(\s*{([\s\S]*?)}\s*\)/g;
    let match;

    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaContent = match[2];

      // Try to extract body schema
      const bodyMatch = schemaContent.match(/body:\s*z\.object\s*\(\s*{([\s\S]*?)}\s*\)/);
      if (bodyMatch) {
        const bodyFields = this.extractZodFields(bodyMatch[1]);
        schemas[schemaName] = bodyFields;
      }
    }

    return schemas;
  }

  /**
   * Extract fields from Zod schema
   */
  extractZodFields(schemaContent) {
    const fields = {};

    // Match field definitions
    const fieldRegex = /(\w+):\s*z\.(string|number|boolean|array|enum|date)/g;
    let match;

    while ((match = fieldRegex.exec(schemaContent)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];

      // Generate sample value based on type
      fields[fieldName] = this.generateSampleValue(fieldName, fieldType);
    }

    return fields;
  }

  /**
   * Generate sample value for field
   */
  generateSampleValue(fieldName, fieldType) {
    // Field-specific samples
    const fieldSamples = {
      email: '{{TEST_EMAIL}}',
      password: '{{TEST_PASSWORD}}',
      newPassword: '{{NEW_PASSWORD}}',
      confirmPassword: '{{NEW_PASSWORD}}',
      currentPassword: '{{TEST_PASSWORD}}',
      name: '{{TEST_NAME}}',
      title: 'Sample Title',
      description: 'Sample description text',
      chatId: '{{chatId}}',
      messageId: '{{messageId}}',
      userId: '{{userId}}',
      sessionId: '{{sessionId}}',
      paymentId: '{{paymentId}}',
      subject: 'Mathematics',
      oneTimeCode: 123456,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      reason: 'Sample reason',
      rejectionReason: 'Sample rejection reason',
      cancellationReason: 'Sample cancellation reason',
      rating: 5,
      comment: 'Sample comment',
      text: 'Sample text message',
      targetId: '{{TARGET_ID}}',
      targetModel: 'Task',
      businessType: 'individual',
      country: 'US',
    };

    if (fieldSamples[fieldName]) {
      return fieldSamples[fieldName];
    }

    // Type-based defaults
    switch (fieldType) {
      case 'string':
        return `sample_${fieldName}`;
      case 'number':
        return 0;
      case 'boolean':
        return true;
      case 'array':
        return [];
      default:
        return '';
    }
  }

  /**
   * Parse route file and extract endpoints
   */
  parseRouteFile(filePath, basePath, validationSchemas) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const endpoints = [];

    // Find all router method calls
    const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const matchIndex = match.index;

      // Extract JSDoc comment and inline comment
      const { description, access } = this.extractRouteInfo(content, matchIndex, lines);

      // Find validation schema reference
      const validationMatch = content.slice(matchIndex, matchIndex + 500).match(
        /validateRequest\s*\(\s*\w+\.(\w+)\s*\)/
      );
      const schemaName = validationMatch ? validationMatch[1] : null;

      // Build full path
      const fullPath = `/api/v1${basePath}${routePath === '/' ? '' : routePath}`;

      // Generate request
      const endpoint = this.createEndpoint({
        method,
        path: routePath,
        fullPath,
        description,
        access,
        schemaName,
        validationSchemas,
      });

      endpoints.push(endpoint);
    }

    return endpoints;
  }

  /**
   * Extract route info from JSDoc comments
   */
  extractRouteInfo(content, matchIndex, lines) {
    let description = '';
    let access = 'Private';

    // Find the line number
    const beforeMatch = content.substring(0, matchIndex);
    const lineNumber = beforeMatch.split('\n').length - 1;

    // Look backwards for JSDoc or inline comment
    for (let i = lineNumber - 1; i >= Math.max(0, lineNumber - 20); i--) {
      const line = lines[i].trim();

      // Stop at another route definition
      if (line.startsWith('router.')) break;

      // Extract @desc
      if (line.includes('@desc')) {
        const descMatch = line.match(/@desc\s+(.+)/);
        if (descMatch) description = descMatch[1].trim();
      }

      // Extract @access
      if (line.includes('@access')) {
        const accessMatch = line.match(/@access\s+(.+)/);
        if (accessMatch) access = accessMatch[1].trim();
      }

      // Simple inline comment
      if (line.startsWith('//') && !description) {
        description = line.replace('//', '').trim();
      }
    }

    return { description, access };
  }

  /**
   * Create Postman endpoint object
   */
  createEndpoint({ method, path, fullPath, description, access, schemaName, validationSchemas }) {
    const name = description || this.generateEndpointName(method, path);

    // Parse URL with path parameters
    const urlParts = fullPath.split('/').filter(p => p);
    const pathWithVariables = fullPath.replace(/:(\w+)/g, ':$1');

    const endpoint = {
      name,
      request: {
        method,
        header: [
          {
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          },
        ],
        url: {
          raw: `{{BASE_URL}}${pathWithVariables}`,
          host: ['{{BASE_URL}}'],
          path: urlParts.map(p => p.startsWith(':') ? p : p),
        },
      },
      response: [],
    };

    // Add body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      let bodyContent = {};

      // Try to get body from validation schema
      if (schemaName && validationSchemas[schemaName]) {
        bodyContent = validationSchemas[schemaName];
      } else {
        // Generate default body based on endpoint
        bodyContent = this.generateDefaultBody(path, method);
      }

      endpoint.request.body = {
        mode: 'raw',
        raw: JSON.stringify(bodyContent, null, 2),
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    }

    // Add test script for auto-saving IDs
    const testScript = this.generateTestScript(path, method);
    if (testScript) {
      endpoint.event = [
        {
          listen: 'test',
          script: {
            exec: testScript,
            type: 'text/javascript',
          },
        },
      ];
    }

    return endpoint;
  }

  /**
   * Generate default body for common endpoints
   */
  generateDefaultBody(path, method) {
    // Auth endpoints
    if (path.includes('login')) {
      return { email: '{{TEST_EMAIL}}', password: '{{TEST_PASSWORD}}' };
    }
    if (path.includes('forget-password') || path.includes('resend-verify')) {
      return { email: '{{TEST_EMAIL}}' };
    }
    if (path.includes('reset-password')) {
      return { newPassword: '{{NEW_PASSWORD}}', confirmPassword: '{{NEW_PASSWORD}}' };
    }
    if (path.includes('change-password')) {
      return {
        currentPassword: '{{TEST_PASSWORD}}',
        newPassword: '{{NEW_PASSWORD}}',
        confirmPassword: '{{NEW_PASSWORD}}',
      };
    }
    if (path.includes('verify-email')) {
      return { email: '{{TEST_EMAIL}}', oneTimeCode: 123456 };
    }

    // Chat/Message
    if (path.includes('message') || path.includes('chat')) {
      return { chatId: '{{chatId}}', text: 'Hello, this is a test message!' };
    }

    // Session
    if (path.includes('propose')) {
      return {
        chatId: '{{chatId}}',
        subject: 'Mathematics',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        description: 'Session description',
      };
    }
    if (path.includes('reject')) {
      return { rejectionReason: 'Not available at this time' };
    }
    if (path.includes('cancel')) {
      return { cancellationReason: 'Need to reschedule' };
    }

    // Bookmark
    if (path.includes('bookmark')) {
      return { targetId: '{{TARGET_ID}}', targetModel: 'Task' };
    }

    // Payment
    if (path.includes('refund')) {
      return { reason: 'Refund requested by customer' };
    }
    if (path.includes('account')) {
      return { businessType: 'individual', country: 'US' };
    }

    return {};
  }

  /**
   * Generate test script for auto-saving IDs
   */
  generateTestScript(path, method) {
    // Login - save tokens
    if (path.includes('login') && method === 'POST') {
      return [
        '// Auto-save tokens from login response',
        'const response = pm.response.json();',
        '',
        'if (response.success && response.data) {',
        '  if (response.data.accessToken) {',
        '    pm.collectionVariables.set("accessToken", response.data.accessToken);',
        '    console.log("✅ Access token saved");',
        '  }',
        '',
        '  if (response.data.refreshToken) {',
        '    pm.collectionVariables.set("refreshToken", response.data.refreshToken);',
        '    console.log("✅ Refresh token saved");',
        '  }',
        '',
        '  if (response.data.user && response.data.user._id) {',
        '    pm.collectionVariables.set("userId", response.data.user._id);',
        '    console.log("✅ User ID saved:", response.data.user._id);',
        '  }',
        '}',
      ];
    }

    // Chat creation - save chat ID
    if ((path.includes('chat') || path === '/') && method === 'POST') {
      return [
        '// Auto-save chat ID',
        'const response = pm.response.json();',
        '',
        'if (response.success && response.data && response.data._id) {',
        '  pm.collectionVariables.set("chatId", response.data._id);',
        '  console.log("✅ Chat ID saved:", response.data._id);',
        '}',
      ];
    }

    // Message - save message ID
    if (path.includes('message') && method === 'POST') {
      return [
        '// Auto-save message ID',
        'const response = pm.response.json();',
        '',
        'if (response.success && response.data && response.data._id) {',
        '  pm.collectionVariables.set("messageId", response.data._id);',
        '  console.log("✅ Message ID saved:", response.data._id);',
        '}',
      ];
    }

    // Payment - save payment ID
    if (path.includes('payment') && method === 'POST') {
      return [
        '// Auto-save payment ID',
        'const response = pm.response.json();',
        '',
        'if (response.success && response.data) {',
        '  if (response.data._id) {',
        '    pm.collectionVariables.set("paymentId", response.data._id);',
        '    console.log("✅ Payment ID saved:", response.data._id);',
        '  }',
        '  if (response.data.clientSecret) {',
        '    pm.collectionVariables.set("clientSecret", response.data.clientSecret);',
        '    console.log("✅ Client secret saved");',
        '  }',
        '}',
      ];
    }

    // Session - save session ID
    if (path.includes('session') && method === 'POST') {
      return [
        '// Auto-save session ID',
        'const response = pm.response.json();',
        '',
        'if (response.success && response.data && response.data._id) {',
        '  pm.collectionVariables.set("sessionId", response.data._id);',
        '  console.log("✅ Session ID saved:", response.data._id);',
        '}',
      ];
    }

    return null;
  }

  /**
   * Generate endpoint name from method and path
   */
  generateEndpointName(method, path) {
    if (path === '/') {
      return `${method} - Get All`;
    }

    // Replace :param with {param}
    const readablePath = path.replace(/:(\w+)/g, '{$1}');

    // Convert to title case
    const parts = readablePath.split('/').filter(p => p);
    const name = parts
      .map(part => {
        if (part.includes('{')) return part;
        return part
          .split('-')
          .map(word => this.capitalize(word))
          .join(' ');
      })
      .join(' - ');

    return `${method} - ${name || 'Root'}`;
  }

  /**
   * Generate collection variables
   */
  generateVariables() {
    return [
      { key: 'BASE_URL', value: 'http://localhost:5000', type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
      { key: 'refreshToken', value: '', type: 'string' },
      { key: 'userId', value: '', type: 'string' },
      { key: 'chatId', value: '', type: 'string' },
      { key: 'messageId', value: '', type: 'string' },
      { key: 'sessionId', value: '', type: 'string' },
      { key: 'paymentId', value: '', type: 'string' },
      { key: 'clientSecret', value: '', type: 'string' },
      { key: 'applicationId', value: '', type: 'string' },
      { key: 'subjectId', value: '', type: 'string' },
      { key: 'subscriptionId', value: '', type: 'string' },
      { key: 'billingId', value: '', type: 'string' },
      { key: 'reviewId', value: '', type: 'string' },
      { key: 'TARGET_ID', value: '', type: 'string' },
      { key: 'TEST_EMAIL', value: 'test@example.com', type: 'string' },
      { key: 'TEST_PASSWORD', value: 'SecurePass123!', type: 'string' },
      { key: 'TEST_NAME', value: 'John Doe', type: 'string' },
      { key: 'NEW_PASSWORD', value: 'NewSecure123!', type: 'string' },
      { key: 'UPDATED_NAME', value: 'Updated Name', type: 'string' },
    ];
  }

  /**
   * Generate collection-level events
   */
  generateCollectionEvents() {
    return [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            '// Auto-inject Bearer token if available',
            'const token = pm.collectionVariables.get("accessToken");',
            '',
            'if (token) {',
            '  pm.request.headers.add({',
            '    key: "Authorization",',
            '    value: "Bearer " + token',
            '  });',
            '}',
          ],
        },
      },
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            '// Generic response validation',
            'pm.test("Status code is 2xx", function () {',
            '  pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);',
            '});',
            '',
            'pm.test("Response has success field", function () {',
            '  const response = pm.response.json();',
            '  pm.expect(response).to.have.property("success");',
            '});',
          ],
        },
      },
    ];
  }

  /**
   * Convert API path to module name
   */
  pathToModuleName(path) {
    return path
      .replace(/^\//, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const generator = new SmartPostmanGenerator();

  if (args.length === 0) {
    // Generate complete collection
    await generator.generateCompleteCollection();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Smart Postman Collection Generator');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/generate-postman-collection.js           Generate complete collection');
    console.log('  node scripts/generate-postman-collection.js <module>  Generate single module');
    console.log('  node scripts/generate-postman-collection.js --help    Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/generate-postman-collection.js');
    console.log('  node scripts/generate-postman-collection.js auth');
    console.log('  node scripts/generate-postman-collection.js session');
  } else {
    // Generate single module
    await generator.generateSingleModule(args[0]);
  }
}

// Run
main().catch(console.error);