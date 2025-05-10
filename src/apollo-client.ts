import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to strip URL
const stripUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  
  try {
    // Remove protocol (http://, https://)
    let stripped = url.replace(/^https?:\/\//, '');
    
    // Remove www.
    stripped = stripped.replace(/^www\./, '');
    
    // Remove trailing slash
    stripped = stripped.replace(/\/$/, '');
    
    // Convert to lowercase
    stripped = stripped.toLowerCase();
    
    return stripped;
  } catch (error) {
    console.error('Error stripping URL:', error);
    return url;
  }
};

// Type definitions for Apollo.io API responses
export interface PeopleEnrichmentQuery {
  first_name?: string;
  last_name?: string;
  email?: string;
  domain?: string;
  organization_name?: string;
  [key: string]: any;
}

export interface OrganizationEnrichmentQuery {
  domain?: string;
  name?: string;
  [key: string]: any;
}

export interface PeopleSearchQuery {
  q_organization_domains_list?: string[];
  person_titles?: string[];
  person_seniorities?: string[];
  [key: string]: any;
}

export interface OrganizationSearchQuery {
  q_organization_domains_list?: string[];
  organization_locations?: string[];
  [key: string]: any;
}

export interface EmployeesOfCompanyQuery {
  company: string;
  website_url?: string;
  linkedin_url?: string;
  [key: string]: any;
}

export class ApolloClient {
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private axiosInstance: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APOLLO_IO_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('APOLLO_IO_API_KEY environment variable is required');
    }
    
    this.baseUrl = 'https://api.apollo.io/api/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': this.apiKey
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers
    });
  }

  /**
   * Use the People Enrichment endpoint to enrich data for 1 person.
   * https://docs.apollo.io/reference/people-enrichment
   */
  async peopleEnrichment(query: PeopleEnrichmentQuery): Promise<any> {
    try {
      const url = `${this.baseUrl}/people/match`;
      console.error('url', url);
      console.error('query', query);
      const response = await this.axiosInstance.post(url, query);
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      return null;
    }
  }

  /**
   * Use the Organization Enrichment endpoint to enrich data for 1 company.
   * https://docs.apollo.io/reference/organization-enrichment
   */
  async organizationEnrichment(query: OrganizationEnrichmentQuery): Promise<any> {
    try {
      const url = `${this.baseUrl}/organizations/enrich`;
      const response = await this.axiosInstance.get(url, { params: query });
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      return null;
    }
  }

  /**
   * Use the People Search endpoint to find people.
   * https://docs.apollo.io/reference/people-search
   */
  async peopleSearch(query: PeopleSearchQuery): Promise<any> {
    try {
      const url = `${this.baseUrl}/mixed_people/search`;
      const response = await this.axiosInstance.post(url, query);
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      return null;
    }
  }

  /**
   * Use the Organization Search endpoint to find organizations.
   * https://docs.apollo.io/reference/organization-search
   */
  async organizationSearch(query: OrganizationSearchQuery): Promise<any> {
    try {
      const url = `${this.baseUrl}/mixed_companies/search`;
      const response = await this.axiosInstance.post(url, query);
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      return null;
    }
  }

  /**
   * Use the Organization Job Postings endpoint to find job postings for a specific organization.
   * https://docs.apollo.io/reference/organization-jobs-postings
   */
  async organizationJobPostings(organizationId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/organizations/${organizationId}/job_postings`;
      const response = await this.axiosInstance.get(url);
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      return null;
    }
  }

  /**
   * Get email address for a person using their Apollo ID
   */
  async getPersonEmail(apolloId: string): Promise<any> {
    try {
      if (!apolloId) {
        throw new Error('Apollo ID is required');
      }

      const baseUrl = `https://app.apollo.io/api/v1/mixed_people/add_to_my_prospects`;
      const payload = {
        entity_ids: [apolloId],
        analytics_context: 'Searcher: Individual Add Button',
        skip_fetching_people: true,
        cta_name: 'Access email',
        cacheKey: Date.now()
      };

      const response = await axios.post(baseUrl, payload, { 
        headers: { 
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        } 
      });

      if (!response.data) {
        throw new Error('No data received from Apollo API');
      }

      const emails = (response?.data?.contacts ?? []).map((item: any) => item.email);
      return emails;
    } catch (error: any) {
      console.error(`Error getting person email: ${error.message}`);
      return null;
    }
  }

  /**
   * Find employees of a company using company name or website/LinkedIn URL
   */
  async employeesOfCompany(query: EmployeesOfCompanyQuery): Promise<any> {
    try {
      const { company, website_url, linkedin_url } = query;
      
      if (!company) {
        throw new Error('Company name is required');
      }

      const strippedWebsiteUrl = stripUrl(website_url);
      const strippedLinkedinUrl = stripUrl(linkedin_url);
      
      // First search for the company
      const companySearchPayload = {
        q_organization_name: company,
        page: 1,
        limit: 100
      };
      
      const mixedCompaniesResponse = await axios.post(
        'https://api.apollo.io/v1/mixed_companies/search', 
        companySearchPayload, 
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey
          }
        }
      );
      
      if (!mixedCompaniesResponse.data) {
        throw new Error('No data received from Apollo API');
      }
      
      let organizations = mixedCompaniesResponse.data.organizations;
      if (organizations.length === 0) {
        throw new Error('No organizations found');
      }
      
      // Filter companies by website or LinkedIn URL if provided
      const companyObjs = organizations.filter((item: any) => {
        const companyLinkedin = stripUrl(item.linkedin_url);
        const companyWebsite = stripUrl(item.website_url);
        
        if (strippedLinkedinUrl && companyLinkedin && companyLinkedin === strippedLinkedinUrl) {
          return true;
        } else if (strippedWebsiteUrl && companyWebsite && companyWebsite === strippedWebsiteUrl) {
          return true;
        }
        return false;
      });
      
      // If we have filtered results, use the first one, otherwise use the first from the original search
      const companyObj = companyObjs.length > 0 ? companyObjs[0] : organizations[0];
      const companyId = companyObj.id;
      
      if (!companyId) {
        throw new Error('Could not determine company ID');
      }
      
      // Now search for employees
      const peopleSearchPayload: any = {
        organization_ids: [companyId],
        page: 1,
        limit: 100
      };
      
      // Add optional filters if provided in the tool config
      if (query.person_seniorities) {
        peopleSearchPayload.person_titles = (query.person_seniorities ?? '').split(',').map((item: string) => item.trim());
      }
      
      if (query.contact_email_status) {
        peopleSearchPayload.contact_email_status_v2 = (query.contact_email_status ?? '').split(',').map((item: string) => item.trim());
      }
      
      const peopleResponse = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search', 
        peopleSearchPayload, 
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey
          }
        }
      );
      
      if (!peopleResponse.data) {
        throw new Error('No data received from Apollo API');
      }
      
      return peopleResponse.data.people || [];
    } catch (error: any) {
      console.error(`Error finding employees: ${error.message}`);
      return null;
    }
  }
}

// Example usage (for testing)
async function main() {
  try {
    // Get API key from environment variable
    const apiKey = process.env.APOLLO_IO_API_KEY;
    if (!apiKey) {
      throw new Error('APOLLO_IO_API_KEY environment variable is required');
    }

    const client = new ApolloClient(apiKey);

    // Example People Enrichment
    const peopleEnrichmentQuery: PeopleEnrichmentQuery = {
      first_name: "Tim",
      last_name: "Zheng"
    };
    const peopleEnrichmentResponse = await client.peopleEnrichment(peopleEnrichmentQuery);
    if (peopleEnrichmentResponse) {
      console.error("People Enrichment Response:", JSON.stringify(peopleEnrichmentResponse, null, 2));
    } else {
      console.error("People Enrichment failed.");
    }

    // Example Organization Enrichment
    const organizationEnrichmentQuery: OrganizationEnrichmentQuery = {
      domain: "apollo.io"
    };
    const organizationEnrichmentResponse = await client.organizationEnrichment(organizationEnrichmentQuery);
    if (organizationEnrichmentResponse) {
      console.error("Organization Enrichment Response:", JSON.stringify(organizationEnrichmentResponse, null, 2));
    } else {
      console.error("Organization Enrichment failed.");
    }

    // Example People Search
    const peopleSearchQuery: PeopleSearchQuery = {
      person_titles: ["Marketing Manager"],
      person_seniorities: ["vp"],
      q_organization_domains_list: ["apollo.io"]
    };
    const peopleSearchResponse = await client.peopleSearch(peopleSearchQuery);
    if (peopleSearchResponse) {
      console.error("People Search Response:", JSON.stringify(peopleSearchResponse, null, 2));
    } else {
      console.error("People Search failed.");
    }

    // Example Organization Search
    const organizationSearchQuery: OrganizationSearchQuery = {
      organization_locations: ["Japan", "Ireland"]
    };
    const organizationSearchResponse = await client.organizationSearch(organizationSearchQuery);
    if (organizationSearchResponse) {
      console.error("Organization Search Response:", JSON.stringify(organizationSearchResponse, null, 2));
    } else {
      console.error("Organization Search failed.");
    }

    // Example Organization Job Postings
    // Note: You need a valid organization ID for this to work
    const organizationId = "5e60b6381c85b4008c83"; // Replace with a valid organization ID
    const organizationJobPostingsResponse = await client.organizationJobPostings(organizationId);
    if (organizationJobPostingsResponse) {
      console.error("Organization Job Postings Response:", JSON.stringify(organizationJobPostingsResponse, null, 2));
    } else {
      console.error("Organization Job Postings failed.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example if this file is executed directly
if (process.argv[1] === import.meta.url) {
  main();
}
