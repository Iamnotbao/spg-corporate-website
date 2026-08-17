require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Missing MONGODB_URI. Create a local .env file first.');
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

async function main() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('MongoDB connected successfully.');
    console.log('Database: spg');
  } catch (error) {
    console.error('MongoDB connection failed:');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
