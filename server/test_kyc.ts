import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testKYCUpload() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'aarav.sharma@spendify.com',
      password: 'Borrower@123'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in successfully');

    // 2. Create dummy files
    const dummyPdf = path.join(__dirname, 'dummy.pdf');
    if (!fs.existsSync(dummyPdf)) {
      fs.writeFileSync(dummyPdf, 'Dummy PDF content');
    }

    // 3. Upload KYC
    const form = new FormData();
    form.append('aadhaarNumber', '123456789012');
    form.append('panNumber', 'ABCDE1234F');
    form.append('aadhaarFile', fs.createReadStream(dummyPdf));
    form.append('panFile', fs.createReadStream(dummyPdf));
    form.append('bankStatementFile', fs.createReadStream(dummyPdf));
    form.append('esignatureFile', fs.createReadStream(dummyPdf));

    const uploadRes = await axios.post('http://localhost:5000/api/kyc/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('KYC Upload Success:', uploadRes.data);
  } catch (err: any) {
    if (err.response) {
      console.error('Upload Error:', err.response.status, err.response.data);
    } else {
      console.error('Request Error:', err.message);
    }
  }
}

testKYCUpload();
