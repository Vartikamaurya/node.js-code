require("dotenv").config();
const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const axios = require("axios");

app.use(express.json());
app.use(cors());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Vartika@2003',
  database: 'vartikadb',
};

let db;

const initializeDBServer = async () => {
  try {
    db = await mysql.createConnection(dbConfig);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mobile VARCHAR(15) UNIQUE NOT NULL
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS otp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mobile VARCHAR(15),
        code VARCHAR(6),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    app.listen(3000, () => {
      console.log("Server started at http://localhost:3000");
    });
  } catch (e) {
    console.log("DB Error:", e.message);
    process.exit(1);
  }
};

initializeDBServer();

app.post("/send-otp", async (req, res) => {
  const { mobile } = req.body;

  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).send("Invalid mobile number");
  }

const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit number


  try {
    await db.execute("DELETE FROM otp WHERE mobile = ?", [mobile]);
    await db.execute("INSERT INTO otp (mobile, code) VALUES (?, ?)", [mobile, otp]);

    // SMS bhejne wala :
    /*
    await axios.post("https://www.fast2sms.com/dev/bulkV2", {
      variables_values: otp,
      route: "otp",
      numbers: mobile,
    }, {
      headers: {
        authorization: process.env.FAST2SMS_API_KEY
      }
    });
    */

    // (REMOVE in production)
    res.send({ message: "OTP generated successfully (SMS not sent)", otp: otp });
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    res.status(500).send("Failed to send OTP");
  }
});;

app.post("/verify-otp", async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    const [rows] = await db.execute(
      `SELECT * FROM otp 
       WHERE mobile = ? 
       AND created_at >= NOW() - INTERVAL 1 MINUTE 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [mobile]
    );

    if (rows.length === 0 || rows[0].code !== otp) {
      return res.status(400).send("Invalid or expired OTP");
    }

    const [userRows] = await db.execute("SELECT * FROM user WHERE mobile = ?", [mobile]);
    if (userRows.length === 0) {
      await db.execute("INSERT INTO user (mobile) VALUES (?)", [mobile]);
    }

    const jwtToken = jwt.sign({ mobile }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.send({ jwtToken });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});


// require("dotenv").config();
// const express = require("express");
// const app = express();
// const mysql = require("mysql2/promise");
// const cors = require("cors");
// const jwt = require("jsonwebtoken");
// const axios = require("axios");

// app.use(express.json());
// app.use(cors());

// const dbConfig = {
//   host: 'localhost',
//   user: 'root',
//   password: 'Vartika@2003',
//   database: 'vartikadb',
// };

// let db;

// const initializeDBServer = async () => {
//   try {
//     db = await mysql.createConnection(dbConfig);
//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS user (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         mobile VARCHAR(15) UNIQUE NOT NULL,
//         name VARCHAR(255),
//         email VARCHAR(255)
//       );
//     `);
//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS otp (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         mobile VARCHAR(15),
//         code VARCHAR(6),
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//       );
//     `);
//     app.listen(3000, () => {
//       console.log("Server started at http://localhost:3000");
//     });
//   } catch (e) {
//     console.log("DB Error:", e.message);
//     process.exit(1);
//   }
// };

// initializeDBServer();

// // SMS Service Configuration
// const sendSMS = async (mobile, otp) => {
//   try {
//     const response = await axios.post(
//       "https://www.fast2sms.com/dev/bulkV2",
//       {
//         variables_values: otp,
//         route: "otp",
//         numbers: mobile,
//       },
//       {
//         headers: {
//           authorization: process.env.FAST2SMS_API_KEY
//         }
//       }
//     );
//     return response.data.return;
//   } catch (error) {
//     console.error("SMS Error:", error.response?.data || error.message);
//     throw new Error("Failed to send SMS");
//   }
// };

// app.post("/send-otp", async (req, res) => {
//   const { phone } = req.body;

//   if (!/^\+?\d{10,15}$/.test(phone)) {
//     return res.status(400).json({ success: false, message: "Invalid phone number" });
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   try {
//     await db.execute("DELETE FROM otp WHERE mobile = ?", [phone]);
//     await db.execute("INSERT INTO otp (mobile, code) VALUES (?, ?)", [phone, otp]);

//     // Uncomment this to actually send SMS in production
//     // const smsResult = await sendSMS(phone, otp);
//     // if (!smsResult) throw new Error("Failed to send SMS");

//     // For development, return the OTP in response
//     res.json({ 
//       success: true, 
//       message: "OTP sent successfully", 
//       otp: otp // Remove this in production
//     });
//   } catch (error) {
//     console.error("OTP Error:", error);
//     res.status(500).json({ 
//       success: false, 
//       message: "Failed to send OTP",
//       error: error.message
//     });
//   }
// });


// app.post("/verify-otp", async (req, res) => {
//   const { phone, otp } = req.body;

//   try {
//     const [rows] = await db.execute(
//       `SELECT * FROM otp 
//        WHERE mobile = ? 
//        AND created_at >= NOW() - INTERVAL 5 MINUTE 
//        ORDER BY created_at DESC 
//        LIMIT 1`,
//       [phone]
//     );

//     if (rows.length === 0 || rows[0].code !== otp) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Invalid or expired OTP" 
//       });
//     }

//     // Check if user exists or create new one
//     const [userRows] = await db.execute("SELECT * FROM user WHERE mobile = ?", [phone]);
//     let user;
    
//     if (userRows.length === 0) {
//       const [result] = await db.execute(
//         "INSERT INTO user (mobile, name, email) VALUES (?, ?, ?)",
//         [phone, `User-${phone}`, `${phone}@example.com`]
//       );
//       user = {
//         id: result.insertId,
//         phone,
//         name: `User-${phone}`,
//         email: `${phone}@example.com`
//       };
//     } else {
//       user = userRows[0];
//     }

//     // Generate JWT token
//     const token = jwt.sign({ userId: user.id, phone }, process.env.JWT_SECRET || 'your-secret-key', { 
//       expiresIn: '1h' 
//     });

//     res.json({ 
//       success: true,
//       message: "OTP verified successfully",
//       user: {
//         phone: user.mobile,
//         name: user.name,
//         email: user.email
//       },
//       token
//     });
//   } catch (error) {
//     console.error("Verification Error:", error);
//     res.status(500).json({ 
//       success: false, 
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// });