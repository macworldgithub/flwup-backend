const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Boran Motors CRM — REST API & Database Service',
    version: '1.0.0',
    description: `
**Automotive Network CRM Backend API**  
Designed for Boran Motors Group & FLWUP integration with Pentana DMS system-of-record synchronization.

### Key Capabilities:
- **Full CRUD Support**: Create, Read, Update, and Delete leads, rooftops, and reports.
- **Dynamic SLA & Metric Calculation**: Real-time KPI summaries computed from MongoDB.
- **Workflow Automation**: AI auto-followup cadence toggle, queued SMS editor, and diary logging.
- **Local Database Persistence**: Powered by MongoDB running on \`mongodb://127.0.0.1:27017/flwup_crm\`.
    `,
    contact: {
      name: 'Boran Motors Group Engineering',
      email: 'tech@booranmotors.com.au'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Localhost Development Server'
    },
    {
      url: 'http://127.0.0.1:5000',
      description: 'Local Loopback Server'
    }
  ],
  tags: [
    { name: 'Leads', description: 'Lead lifecycle, Pentana sync, AI cadence, and Diary management' },
    { name: 'Rooftops', description: 'Dealership rooftop locations and tier configuration' },
    { name: 'Reports', description: 'Scoreboards, SLAs, rep scorecards, and performance presets' },
    { name: 'Metrics & KPIs', description: 'Live aggregate statistics and filter dropdown options' },
    { name: 'Organization', description: 'Group settings, brand colors, and active user profile' },
    { name: 'System', description: 'Database connectivity and migration utilities' }
  ],
  components: {
    schemas: {
      Lead: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6707f123456789abcdef0123' },
          deal_id: { type: 'string', example: 'DL-984214-KIA' },
          pentana_id: { type: 'string', example: 'PENTANA-8392101' },
          store_code: { type: 'string', example: 'Store 70' },
          dealership_name: { type: 'string', example: 'South Morang Kia' },
          dealer_code: { type: 'string', example: 'BOORAN' },
          customer_name: { type: 'string', example: 'Marcus Vance' },
          customer_phone: { type: 'string', example: '+61 412 345 678' },
          customer_email: { type: 'string', example: 'marcus.v@example.com' },
          vehicle_make: { type: 'string', example: 'Kia' },
          vehicle_model: { type: 'string', example: 'Sportage GT-Line' },
          owner_name: { type: 'string', example: 'Sarah Jenkins' },
          status: { type: 'string', enum: ['following_up', 'sold', 'lost', 'deposit_taken', 'lost_competition'], example: 'following_up' },
          source: { type: 'string', example: 'carsales' },
          created_at: { type: 'string', format: 'date-time', example: '2026-10-07T09:15:00.000Z' },
          minutes_to_first_contact: { type: 'number', nullable: true, example: 12 },
          minutes_to_first_touch: { type: 'number', nullable: true, example: 8 },
          follow_ups_sent: { type: 'number', example: 3 },
          ai_status: { type: 'string', enum: ['active', 'off'], example: 'active' },
          ai_schedule_preference: { type: 'string', example: 'after_hours' },
          ai_queued_messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '1' },
                type: { type: 'string', example: 'sms' },
                content: { type: 'string', example: 'Hi Marcus, did you have a chance to look over the quote?' },
                scheduled_for: { type: 'string', example: '2026-10-08T18:30:00Z' },
                editable: { type: 'boolean', example: true }
              }
            }
          },
          diary_entries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', example: '2026-10-07T09:15:00.000Z' },
                user: { type: 'string', example: 'Sarah Jenkins' },
                note: { type: 'string', example: 'Customer called back, test drive booked for Saturday.' }
              }
            }
          },
          test_drive: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['none', 'booked', 'completed'], example: 'completed' },
              licence_captured: { type: 'boolean', example: true }
            }
          },
          trade_in: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['none', 'pending', 'valued'], example: 'valued' },
              value: { type: 'number', nullable: true, example: 18500 }
            }
          }
        }
      },
      LeadCreateInput: {
        type: 'object',
        required: ['customer_name'],
        properties: {
          customer_name: { type: 'string', example: 'David Warner' },
          customer_phone: { type: 'string', example: '+61 498 765 432' },
          customer_email: { type: 'string', example: 'david.warner@example.com' },
          dealership_name: { type: 'string', example: 'South Morang Hyundai' },
          vehicle_make: { type: 'string', example: 'Hyundai' },
          vehicle_model: { type: 'string', example: 'Tucson Elite' },
          owner_name: { type: 'string', example: 'Michael Clark' },
          store_code: { type: 'string', enum: ['Store 70', 'Store 40'], example: 'Store 70' },
          status: { type: 'string', example: 'following_up' },
          source: { type: 'string', example: 'website' },
          ai_status: { type: 'string', enum: ['active', 'off'], example: 'active' }
        }
      },
      LeadUpdateInput: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', example: 'David Warner' },
          customer_phone: { type: 'string', example: '+61 498 765 432' },
          vehicle_make: { type: 'string', example: 'Hyundai' },
          vehicle_model: { type: 'string', example: 'Santa Fe Hybrid' },
          owner_name: { type: 'string', example: 'Michael Clark' },
          status: { type: 'string', example: 'sold' },
          dealership_name: { type: 'string', example: 'South Morang Hyundai' },
          ai_status: { type: 'string', enum: ['active', 'off'], example: 'off' }
        }
      },
      Rooftop: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '4b26f732-f51d-4665-9269-214024aac866' },
          name: { type: 'string', example: 'South Morang Kia' },
          active: { type: 'boolean', example: true },
          tier: { type: 'string', example: 'standard' },
          dealer_code: { type: 'string', example: 'BOORAN' },
          timezone: { type: 'string', example: 'Australia/Melbourne' }
        }
      },
      KPIs: {
        type: 'object',
        properties: {
          total_leads: { type: 'integer', example: 1601 },
          contact_coverage_rate: { type: 'string', example: '99.4' },
          touched_15m_rate: { type: 'string', example: '63.7' },
          median_minutes_to_contact: { type: 'number', example: 8.5 },
          reply_rate: { type: 'string', example: '61.4' },
          sold_count: { type: 'integer', example: 457 },
          sold_rate: { type: 'string', example: '28.5' }
        }
      },
      FilterOptions: {
        type: 'object',
        properties: {
          dealerships: { type: 'array', items: { type: 'string' } },
          makes: { type: 'array', items: { type: 'string' } },
          owners: { type: 'array', items: { type: 'string' } },
          sources: { type: 'array', items: { type: 'string' } },
          stores: { type: 'array', items: { type: 'string' } }
        }
      },
      GenericSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' }
        }
      },
      GenericError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Invalid parameter or resource not found' }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
