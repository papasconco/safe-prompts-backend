const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup only if DATABASE_URL exists
let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Database connected');
}

// Debug logs
console.log('Starting server...');
console.log('PORT:', PORT);
console.log('MAILCHIMP_SERVER_PREFIX:', process.env.MAILCHIMP_SERVER_PREFIX || 'NOT SET');
console.log('API Key exists:', !!process.env.MAILCHIMP_API_KEY);
console.log('List ID exists:', !!process.env.MAILCHIMP_LIST_ID);

// MailChimp configuration
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

// Middleware
app.use(cors({
    origin: ['https://steveacademy.com', 'https://www.steveacademy.com', 'http://localhost'],
    credentials: true
}));
app.use(express.json());

// Your existing MailChimp endpoint - NO CHANGES
app.post('/api/free-sampler-signup', async (req, res) => {
    const { firstName, email, profession, source } = req.body;
    
    if (!email || !firstName || !profession) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    const professionMap = {
        'legal': 'Legal_Professional',
        'financial': 'Financial_Advisor',
        'insurance': 'Insurance_Professional',
        'healthcare': 'Healthcare_Professional',
        'education': 'Educator',
        'data': 'Data_Analyst',
        'tech': 'Tech_Support',
        'social': 'Social_Worker',
        'other': 'Other_Professional'
    };
    
    const tags = ['Free_Sampler', 'Website_Signup', professionMap[profession] || 'Other_Professional'];
    if (source) tags.push(source);
    
    const data = {
        email_address: email,
        status: 'subscribed',
        merge_fields: { FNAME: firstName, PROFESSION: professionMap[profession] || profession },
        tags: tags
    };
    
    try {
        const response = await axios({
            method: 'POST',
            url: `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`,
            headers: {
                'Authorization': `apikey ${MAILCHIMP_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data)
        });
        
        console.log(`New signup: ${email}`);
        res.json({ success: true, message: 'Successfully subscribed!' });
        
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.title === 'Member Exists') {
            return res.json({ success: true, message: 'Welcome back!' });
        }
        console.error('MailChimp Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Subscription failed. Please try again.' });
    }
});

// Database setup - only runs if database is connected
app.get('/api/setup-database', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ success: false, error: 'Database not configured' });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professions (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        total_available INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        prompt_id VARCHAR(50) UNIQUE NOT NULL,
        profession_id INTEGER REFERENCES professions(id),
        title VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        difficulty VARCHAR(20),
        description TEXT,
        safe_template TEXT NOT NULL,
        ultra_safe_template TEXT,
        prompt_text TEXT NOT NULL,
        use_case TEXT,
        time_saved VARCHAR(100),
        outcome TEXT,
        downloads INTEGER DEFAULT 0,
        rating DECIMAL(2,1) DEFAULT 4.5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id INTEGER REFERENCES prompts(id),
        tag_id INTEGER REFERENCES tags(id),
        PRIMARY KEY (prompt_id, tag_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_prompts_profession ON prompts(profession_id);
      CREATE INDEX IF NOT EXISTS idx_prompts_difficulty ON prompts(difficulty);
      CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
      
      INSERT INTO professions (key, title, total_available) VALUES
      ('legal', 'Legal Professionals', 52),
      ('financial', 'Financial Professionals', 48),
      ('insurance', 'Insurance Professionals', 45),
      ('healthcare', 'Healthcare Administrators', 42),
      ('data_analysis', 'Data Analysts', 40),
      ('tech_support', 'Tech Support Professionals', 35),
      ('education', 'Educators', 38),
      ('social_work', 'Social Workers', 37)
      ON CONFLICT (key) DO NOTHING;
    `);

    res.json({ success: true, message: 'Database tables created successfully!' });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});