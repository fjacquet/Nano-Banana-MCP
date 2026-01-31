#!/usr/bin/env node

/**
 * Integration test script for nano-banana MCP server
 * Tests server functionality without requiring a real Gemini API key
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

class IntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('Starting nano-banana MCP server integration tests...\n');

    try {
      await this.testProjectStructure();
      await this.testDependencies();
      await this.testBuildProcess();
      await this.testConfigurationHandling();
      await this.testToolSchema();

      this.printResults();
    } catch (error) {
      console.error('Integration tests failed:', error);
      process.exit(1);
    }
  }

  private async testProjectStructure(): Promise<void> {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'README.md',
      '.gitignore',
      '.eslintrc.json',
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), file));
        this.addResult(`Project structure - ${file}`, true, `${file} exists`);
      } catch {
        this.addResult(`Project structure - ${file}`, false, `${file} missing`);
      }
    }
  }

  private async testDependencies(): Promise<void> {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );

      const requiredDeps = [
        '@modelcontextprotocol/sdk',
        '@google/genai',
        'dotenv',
        'zod',
      ];

      for (const dep of requiredDeps) {
        if (packageJson.dependencies[dep]) {
          this.addResult(`Dependencies - ${dep}`, true, `${dep} found`);
        } else {
          this.addResult(`Dependencies - ${dep}`, false, `${dep} missing`);
        }
      }

      try {
        await fs.access(path.join(process.cwd(), 'node_modules'));
        this.addResult('Dependencies - node_modules', true, 'Dependencies installed');
      } catch {
        this.addResult('Dependencies - node_modules', false, 'Run npm install first');
      }
    } catch (error) {
      this.addResult('Dependencies check', false, `Failed to check dependencies: ${error}`);
    }
  }

  private async testBuildProcess(): Promise<void> {
    return new Promise<void>((resolve) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      let errorOutput = '';

      buildProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      buildProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            await fs.access(path.join(process.cwd(), 'dist'));
            this.addResult('Build process', true, 'Build successful');
          } catch {
            this.addResult('Build process', false, 'Dist directory not created');
          }
        } else {
          this.addResult('Build process', false, `Build failed: ${errorOutput}`);
        }
        resolve();
      });
    });
  }

  private async testConfigurationHandling(): Promise<void> {
    try {
      const testConfig = {
        geminiApiKey: 'test-api-key-for-integration-testing',
      };

      const configPath = path.join(os.homedir(), '.nano-banana-config-test.json');

      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));
      this.addResult('Configuration - Write', true, 'Config file written');

      const configData = await fs.readFile(configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      if (parsedConfig.geminiApiKey === testConfig.geminiApiKey) {
        this.addResult('Configuration - Read', true, 'Config file read correctly');
      } else {
        this.addResult('Configuration - Read', false, 'Config data mismatch');
      }

      await fs.unlink(configPath);
      this.addResult('Configuration - Cleanup', true, 'Test config cleaned up');
    } catch (error) {
      this.addResult('Configuration handling', false, `Configuration test failed: ${error}`);
    }
  }

  private async testToolSchema(): Promise<void> {
    try {
      const indexPath = path.join(process.cwd(), 'src', 'index.ts');
      const sourceCode = await fs.readFile(indexPath, 'utf-8');

      const requiredElements = [
        'configure_gemini_token',
        'generate_image',
        'edit_image',
        'get_configuration_status',
        'continue_editing',
        'get_last_image_info',
        'GoogleGenAI',
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
      ];

      for (const element of requiredElements) {
        if (sourceCode.includes(element)) {
          this.addResult(`Tool Schema - ${element}`, true, `${element} found`);
        } else {
          this.addResult(`Tool Schema - ${element}`, false, `${element} missing`);
        }
      }

      // Ensure old model name is NOT present
      if (!sourceCode.includes('gemini-2.5-flash-image-preview')) {
        this.addResult('Tool Schema - no old model', true, 'Old model name correctly removed');
      } else {
        this.addResult('Tool Schema - no old model', false, 'Old model name still present');
      }

      const hasMimeTypeLogic = sourceCode.includes('getMimeType') &&
                              sourceCode.includes('image/jpeg') &&
                              sourceCode.includes('image/png') &&
                              sourceCode.includes('image/gif');

      this.addResult('MIME type handling', hasMimeTypeLogic,
        hasMimeTypeLogic ? 'MIME type logic found' : 'MIME type logic missing');
    } catch (error) {
      this.addResult('Tool Schema validation', false, `Schema test failed: ${error}`);
    }
  }

  private addResult(name: string, passed: boolean, message: string): void {
    this.results.push({ name, passed, message });
  }

  private printResults(): void {
    console.log('\nIntegration Test Results:');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.message}`);
    });

    console.log('='.repeat(50));
    console.log(`Results: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('All integration tests passed!');
    } else {
      console.log('Some tests failed. Please fix the issues before using the server.');
      process.exit(1);
    }
  }
}

const tester = new IntegrationTester();
tester.runAllTests().catch(console.error);
