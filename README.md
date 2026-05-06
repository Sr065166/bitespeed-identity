# Customer Identity Reconciliation API

A backend service that identifies and links customer identities across multiple purchases by reconciling email addresses and phone numbers.

## Live Endpoint

POST https://bitespeed-identity-w634.onrender.com/identify

## Tech Stack

- Runtime: Node.js with TypeScript
- Framework: Express.js
- Database: SQLite via Prisma ORM
- Hosting: Render.com

## Overview

Customers often use different email addresses and phone numbers across purchases. 
This service intelligently links related contacts into a unified customer identity.

## API Endpoint

### POST /identify

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2, 3]
  }
}
```

## How It Works

- New customer → Creates a new primary contact
- Existing email or phone with new info → Creates a secondary contact linked to primary
- Two separate primaries linked → Older one stays primary, newer becomes secondary
- Primary email and phone always appears first in response arrays

## Example

**Request 1 - New Customer:**
```json
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

**Request 2 - Same phone, new email:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

## Database Schema
```
id             - Auto increment primary key
phoneNumber    - Optional string
email          - Optional string
linkedId       - ID of primary contact this is linked to
linkPrecedence - "primary" or "secondary"
createdAt      - Created timestamp
updatedAt      - Updated timestamp
deletedAt      - Soft delete timestamp
```

## Local Setup
```bash
git clone https://github.com/Sr065166/bitespeed-identity.git
cd bitespeed-identity
npm install
npx prisma migrate dev --name init
npm run dev
```

Server runs on http://localhost:3000

## Test the API (Windows)
```powershell
(Invoke-WebRequest -Uri "https://bitespeed-identity-w634.onrender.com/identify" -Method POST -ContentType "application/json" -Body '{"email":"test@email.com","phoneNumber":"123456"}').Content
```

## GitHub Repository

https://github.com/Sr065166/bitespeed-identity
