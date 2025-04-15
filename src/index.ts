#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { ApolloClient } from './apollo-client.js';
import dotenv from 'dotenv';
import { parseArgs } from 'node:util';

// Load environment variables
dotenv.config();

// Parse command line arguments
const { values } = parseArgs({
  options: {
    'api-key': { type: 'string' }
  }
});

// Initialize Apollo.io client
const apiKey = values['api-key'] || process.env.APOLLO_IO_API_KEY;
if (!apiKey) {
  throw new Error('APOLLO_IO_API_KEY environment variable is required');
}

class ApolloServer {
  // Core server properties
  private server: Server;
  private apollo: ApolloClient;

  constructor() {
    this.server = new Server(
      {
        name: 'apollo-io-manager',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.apollo = new ApolloClient(apiKey);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Define available tools
      const tools: Tool[] = [
        {
          name: 'people_enrichment',
          description: 'Use the People Enrichment endpoint to enrich data for 1 person',
          inputSchema: {
            type: 'object',
            properties: {
              first_name: { 
                type: 'string', 
                description: "Person's first name" 
              },
              last_name: { 
                type: 'string', 
                description: "Person's last name" 
              },
              email: { 
                type: 'string', 
                description: "Person's email address" 
              },
              domain: { 
                type: 'string', 
                description: "Company domain" 
              },
              organization_name: { 
                type: 'string', 
                description: "Organization name" 
              },
              linkedin_url: {
                type: 'string',
                description: "Person's LinkedIn profile URL"
              }
            }
          }
        },
        {
          name: 'organization_enrichment',
          description: 'Use the Organization Enrichment endpoint to enrich data for 1 company',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { 
                type: 'string', 
                description: 'Company domain' 
              },
              name: { 
                type: 'string', 
                description: 'Company name' 
              }
            }
          }
        },
        {
          name: 'people_search',
          description: 'Use the People Search endpoint to find people',
          inputSchema: {
            type: 'object',
            properties: {
              q_organization_domains_list: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of organization domains to search within' 
              },
              person_titles: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of job titles to search for' 
              },
              person_seniorities: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of seniority levels to search for' 
              }
            }
          }
        },
        {
          name: 'organization_search',
          description: 'Use the Organization Search endpoint to find organizations',
          inputSchema: {
            type: 'object',
            properties: {
              q_organization_domains_list: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of organization domains to search for' 
              },
              organization_locations: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of organization locations to search for' 
              }
            }
          }
        },
        {
          name: 'organization_job_postings',
          description: 'Use the Organization Job Postings endpoint to find job postings for a specific organization',
          inputSchema: {
            type: 'object',
            properties: {
              organization_id: { 
                type: 'string', 
                description: 'Apollo.io organization ID' 
              }
            },
            required: ['organization_id']
          }
        },
        {
          name: 'get_person_email',
          description: 'Get email address for a person using their Apollo ID',
          inputSchema: {
            type: 'object',
            properties: {
              apollo_id: {
                type: 'string',
                description: 'Apollo.io person ID'
              }
            },
            required: ['apollo_id']
          }
        },
        {
          name: 'employees_of_company',
          description: 'Find employees of a company using company name or website/LinkedIn URL',
          inputSchema: {
            type: 'object',
            properties: {
              company: {
                type: 'string',
                description: 'Company name'
              },
              website_url: {
                type: 'string',
                description: 'Company website URL'
              },
              linkedin_url: {
                type: 'string',
                description: 'Company LinkedIn URL'
              }
            },
            required: ['company']
          }
        }
      ];
      
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const args = request.params.arguments ?? {};

        switch (request.params.name) {
          case 'people_enrichment': {
            const result = await this.apollo.peopleEnrichment(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
          
          case 'organization_enrichment': {
            const result = await this.apollo.organizationEnrichment(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
          
          case 'people_search': {
            const result = await this.apollo.peopleSearch(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
          
          case 'organization_search': {
            const result = await this.apollo.organizationSearch(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
          
          case 'organization_job_postings': {
            const result = await this.apollo.organizationJobPostings(args.organization_id as string);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
          
          case 'get_person_email': {
            const result = await this.apollo.getPersonEmail(args.apollo_id as string);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
          
          case 'employees_of_company': {
            const result = await this.apollo.employeesOfCompany(args as any);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error: any) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        return {
          content: [{
            type: 'text',
            text: `Apollo.io API error: ${error.message}`
          }],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Apollo.io MCP server started');
  }
}

export async function serve(): Promise<void> {
  const server = new ApolloServer();
  await server.run();
}

const server = new ApolloServer();
server.run().catch(console.error);
