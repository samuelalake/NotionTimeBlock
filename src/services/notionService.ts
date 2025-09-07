import { Client } from '@notionhq/client';
import { TaskData, NotionTaskUpdate } from '../types';
import { logger } from '../utils/logger';

export class NotionService {
  private notion: Client;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    this.notion = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  /**
   * Update a Notion task with scheduling information
   */
  async updateTask(taskId: string, updates: NotionTaskUpdate): Promise<boolean> {
    try {
      const response = await this.notion.pages.update({
        page_id: taskId,
        properties: this.formatPropertiesForNotion(updates),
      });

      logger.info(`Successfully updated Notion task ${taskId}`, { updates });
      return true;
    } catch (error) {
      logger.error(`Failed to update Notion task ${taskId}`, { error, updates });
      return false;
    }
  }

  /**
   * Get task details from Notion (if needed for additional context)
   */
  async getTask(taskId: string): Promise<any> {
    try {
      const response = await this.notion.pages.retrieve({ page_id: taskId });
      return response;
    } catch (error) {
      logger.error(`Failed to retrieve Notion task ${taskId}`, { error });
      throw error;
    }
  }

  /**
   * Format properties for Notion API
   */
  private formatPropertiesForNotion(updates: NotionTaskUpdate): any {
    const properties: any = {};

    // Use the existing "Planned" property for scheduling
    if (updates['Time Block Start'] && updates['Time Block End']) {
      properties['Planned'] = {
        date: {
          start: updates['Time Block Start'],
          end: updates['Time Block End'],
        },
      };
    }

    // Update Scheduling Message if it exists
    if (updates['Scheduling Message']) {
      properties['Scheduling Message'] = {
        rich_text: [
          {
            text: {
              content: updates['Scheduling Message'],
            },
          },
        ],
      };
    }

    // Skip "Scheduling Status" since it doesn't exist in your database

    return properties;
  }

  /**
   * Validate that the database has the required properties
   */
  async validateDatabase(): Promise<boolean> {
    try {
      const response = await this.notion.databases.retrieve({
        database_id: this.databaseId,
      });

      const requiredProperties = [
        'Planned', // Date property for scheduling
        'Estimates', // Select property for duration
        'Scheduling Message', // Text property for scheduling messages
      ];

      const existingProperties = Object.keys(response.properties);
      const missingProperties = requiredProperties.filter(
        prop => !existingProperties.includes(prop)
      );

      if (missingProperties.length > 0) {
        logger.warn('Missing required properties in Notion database', {
          missing: missingProperties,
          existing: existingProperties,
        });
        return false;
      }

      logger.info('Notion database validation successful');
      return true;
    } catch (error) {
      logger.error('Failed to validate Notion database', { error });
      return false;
    }
  }
}

