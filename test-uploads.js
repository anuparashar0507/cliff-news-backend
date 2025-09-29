const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const prisma = new PrismaClient();

async function createTestUser() {
  const hashedPassword = await bcrypt.hash('Test123456!', 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: 'test@cliffnews.com',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN'
      }
    });
    console.log('User created:', user);
    return user;
  } catch (error) {
    console.log('User might already exist, trying to find...');
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@cliffnews.com' }
    });
    return existingUser;
  }
}

async function loginUser() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@cliffnews.com',
      password: 'Test123456!'
    });
    console.log('Login successful!');
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
}

async function testImageUpload(token) {
  const imagePath = 'public/uploads/images/thumb_screencapture-localhost-5173-testing-2025-07-29-13-43-57-1758567892192-330361027.png';

  if (!fs.existsSync(imagePath)) {
    console.log('Creating test image...');
    // Create a simple test image using base64
    const testImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k=';
    const buffer = Buffer.from(testImageBase64, 'base64');
    fs.writeFileSync(imagePath, buffer);
  }

  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));

  try {
    const response = await axios.post(
      'http://localhost:3000/api/upload/cloudinary/image',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('Image upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Image upload failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('=== Cloudinary Upload Test ===\n');

  // Step 1: Create test user
  console.log('1. Creating test user...');
  await createTestUser();

  // Step 2: Login to get token
  console.log('\n2. Logging in...');
  const token = await loginUser();

  if (!token) {
    console.log('Failed to get auth token. Exiting...');
    await prisma.$disconnect();
    return;
  }

  // Step 3: Test image upload
  console.log('\n3. Testing Cloudinary image upload...');
  const uploadResult = await testImageUpload(token);

  if (uploadResult) {
    console.log('\n✅ Cloudinary integration is working!');
    console.log('Uploaded image URL:', uploadResult.file?.url);
  } else {
    console.log('\n❌ Cloudinary upload failed. Check your .env configuration.');
  }

  await prisma.$disconnect();
}

main().catch(console.error);