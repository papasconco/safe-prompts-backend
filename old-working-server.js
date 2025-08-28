const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Add after your existing requires
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Then add this route after your existing routes (before app.listen)
app.get('/api/setup-database', async (req, res) => {
  try {
    // Create all tables...
    // [paste the full setup code I provided earlier]
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log('Starting server...');
console.log('PORT:', PORT);
console.log('MAILCHIMP_SERVER_PREFIX:', process.env.MAILCHIMP_SERVER_PREFIX || 'NOT SET');
console.log('API Key exists:', !!process.env.MAILCHIMP_API_KEY);
console.log('List ID exists:', !!process.env.MAILCHIMP_LIST_ID);

// MailChimp configuration - ONLY DECLARE ONCE
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

// Middleware
app.use(cors({
    origin: [
        'https://steveacademy.com',
        'https://www.steveacademy.com',
        'http://localhost'
    ],
    credentials: true
}));
app.use(express.json());

// Free sampler signup endpoint
app.post('/api/free-sampler-signup', async (req, res) => {
    const { firstName, email, profession, source } = req.body;
    
    if (!email || !firstName || !profession) {
        return res.status(400).json({ 
            success: false,
            error: 'All fields are required' 
        });
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
    
    const tags = [
        'Free_Sampler',
        'Website_Signup',
        professionMap[profession] || 'Other_Professional'
    ];
    
    if (source) {
        tags.push(source);
    }
    
    const data = {
        email_address: email,
        status: 'subscribed',
        merge_fields: {
            FNAME: firstName,
            PROFESSION: professionMap[profession] || profession
        },
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
        
        res.json({ 
            success: true,
            message: 'Successfully subscribed!'
        });
        
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.title === 'Member Exists') {
            return res.json({ 
                success: true,
                message: 'Welcome back!'
            });
        }
        
        console.error('MailChimp Error:', error.response?.data || error.message);
        
        res.status(500).json({ 
            success: false,
            error: 'Subscription failed. Please try again.' 
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});