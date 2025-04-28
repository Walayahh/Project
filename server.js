// server.js - Express server for StudyBuddy app
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Log server startup info
console.log('Starting StudyBuddy server...');
console.log('Environment variables loaded: ', {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'Set' : 'Not set',
  MAPS_API_KEY: process.env.MAPS_API_KEY ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
  SHEETS_ID: process.env.SHEETS_ID ? 'Set' : 'Not set'
});

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for any path
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to safely expose config to client
app.get('/api/config', (req, res) => {
  // Only send necessary config to client
  res.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    MAPS_API_KEY: process.env.MAPS_API_KEY,
    SHEETS_ID: process.env.SHEETS_ID
  });
});

// API endpoint to proxy chat requests to OpenAI
app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ reply: 'Message is required' });
      }
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('OpenAI API key is missing');
        return res.status(200).json({ 
          reply: "I'm currently unable to connect to my brain. Please check the server configuration." 
        });
      }
      
      console.log('Sending chat request to OpenAI...');
      
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are StudyBuddy, a helpful study assistant.' },
              { role: 'user', content: message }
            ]
          })
        });
  
        // For debugging
        console.log('OpenAI status:', openaiResponse.status);
        
        const data = await openaiResponse.json();
        
        if (!openaiResponse.ok) {
          console.error('OpenAI API error:', data);
          return res.status(200).json({ 
            reply: 'I encountered an issue connecting to my knowledge base. This might be due to an invalid API key or rate limiting.' 
          });
        }
  
        return res.json({ reply: data.choices?.[0]?.message?.content || 'No response from AI service' });
      } catch (apiError) {
        console.error('OpenAI API call failed:', apiError);
        return res.status(200).json({ 
          reply: 'I had trouble processing your request. This might be due to network issues or an invalid API configuration.' 
        });
      }
    } catch (error) {
      console.error('Chat API general error:', error);
      res.status(200).json({ 
        reply: 'Sorry, I encountered an unexpected error. Please try again later.' 
      });
    }
  });

// Start the server
app.listen(PORT, () => {
  console.log(`StudyBuddy server running on http://localhost:${PORT}`);
});