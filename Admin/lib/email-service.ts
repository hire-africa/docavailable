// Email service for sending notifications directly via SMTP
import nodemailer from 'nodemailer';

const MAIN_APP_URL = 'https://docavailable.3vbdv.ondigitalocean.app';

// Create transporter using the main app's email configuration
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'Docavailable01@gmail.com',
    pass: 'sdekzppdxdknhlkd'
  },
  tls: {
    rejectUnauthorized: false
  }
});

interface EmailData {
  to: string;
  subject: string;
  html: string;
  doctorName: string;
  doctorEmail: string;
}

// Email templates
export const emailTemplates = {
  approval: (doctorName: string, doctorEmail: string) => ({
    subject: '🎉 Welcome to DocAvailable - Your Application Has Been Approved!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DocAvailable</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 5px; }
          .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          h1 { margin: 0; font-size: 28px; }
          h2 { color: #1f2937; margin-top: 25px; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations, Dr. ${doctorName}!</h1>
            <p>Your application to join DocAvailable has been approved!</p>
          </div>
          
          <div class="content">
            <p>Dear Dr. ${doctorName},</p>
            
            <p>We are thrilled to welcome you to the DocAvailable family! Your medical expertise and dedication to patient care make you a valuable addition to our platform.</p>
            
            <div class="highlight">
              <h2>🚀 What's Next?</h2>
              <ul>
                <li>Your account is now active and ready to use</li>
                <li>You can start accepting patient appointments immediately</li>
                <li>Access your dashboard at <a href="${MAIN_APP_URL}/doctor/dashboard">DocAvailable Dashboard</a></li>
                <li>Complete your profile to attract more patients</li>
              </ul>
            </div>
            
            <h2>🏥 Our Core Values & Guidelines</h2>
            
            <div class="warning">
              <h3>🤝 Treat Every Patient with Respect</h3>
              <p>Every patient who comes to you is seeking help during a vulnerable time. Please:</p>
              <ul>
                <li>Listen actively and empathetically to their concerns</li>
                <li>Provide clear, understandable explanations</li>
                <li>Be patient and understanding, especially with anxious patients</li>
                <li>Respect cultural differences and personal beliefs</li>
                <li>Maintain a professional yet compassionate demeanor</li>
              </ul>
            </div>
            
            <div class="warning">
              <h3>🔒 Maintain Strict Patient Anonymity</h3>
              <p>Patient privacy is our top priority. You must:</p>
              <ul>
                <li>Never share patient information with unauthorized parties</li>
                <li>Use secure communication channels only</li>
                <li>Follow HIPAA guidelines and local privacy laws</li>
                <li>Report any privacy concerns immediately</li>
                <li>Keep all patient data encrypted and secure</li>
              </ul>
            </div>
            
            <h2>💡 Tips for Success on DocAvailable</h2>
            <ul>
              <li><strong>Complete Your Profile:</strong> Add a professional photo, detailed bio, and list your specializations</li>
              <li><strong>Set Your Availability:</strong> Keep your calendar updated to maximize bookings</li>
              <li><strong>Respond Promptly:</strong> Quick responses to patient inquiries build trust</li>
              <li><strong>Maintain High Ratings:</strong> Quality care leads to positive reviews and more patients</li>
              <li><strong>Stay Updated:</strong> Keep up with medical advances and platform updates</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${MAIN_APP_URL}/doctor/dashboard" class="button">Access Your Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help. You can reach us at support@docavailable.com or through the help center in your dashboard.</p>
            
            <p>Welcome aboard, and thank you for choosing DocAvailable!</p>
            
            <p>Best regards,<br>
            The DocAvailable Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${doctorEmail}</p>
            <p>© 2024 DocAvailable. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  rejection: (doctorName: string, doctorEmail: string) => ({
    subject: 'DocAvailable Application Update - Additional Information Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DocAvailable Application Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }
          .info { background: #dbeafe; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          h1 { margin: 0; font-size: 28px; }
          h2 { color: #1f2937; margin-top: 25px; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Application Update Required</h1>
            <p>Your DocAvailable application needs additional information</p>
          </div>
          
          <div class="content">
            <p>Dear Dr. ${doctorName},</p>
            
            <p>Thank you for your interest in joining DocAvailable. After careful review of your application, we need additional information before we can proceed with approval.</p>
            
            <div class="highlight">
              <h2>📝 Information Required</h2>
              <p>To complete your application, please ensure you have provided:</p>
              <ul>
                <li>Valid medical license number and verification</li>
                <li>Complete professional credentials and certifications</li>
                <li>Clear profile photo and professional bio</li>
                <li>Accurate contact information and address</li>
                <li>Specialization details and years of experience</li>
                <li>Hospital affiliations (if applicable)</li>
              </ul>
            </div>
            
            <div class="info">
              <h2>🔄 Next Steps</h2>
              <p>To resubmit your application with the required information:</p>
              <ol>
                <li>Log into your DocAvailable account</li>
                <li>Complete all required profile sections</li>
                <li>Upload necessary documentation</li>
                <li>Submit your updated application for review</li>
              </ol>
            </div>
            
            <h2>💡 Tips for a Successful Application</h2>
            <ul>
              <li><strong>Be Thorough:</strong> Complete every section of your profile</li>
              <li><strong>Provide Documentation:</strong> Upload clear copies of all required documents</li>
              <li><strong>Be Accurate:</strong> Ensure all information is current and correct</li>
              <li><strong>Professional Presentation:</strong> Use a clear, professional profile photo</li>
              <li><strong>Detailed Bio:</strong> Write a comprehensive bio highlighting your expertise</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${MAIN_APP_URL}/doctor/application" class="button">Update Your Application</a>
            </div>
            
            <p>We appreciate your patience and look forward to welcoming you to the DocAvailable community once your application is complete.</p>
            
            <p>If you have any questions about the application process or need assistance, please don't hesitate to contact our support team at support@docavailable.com.</p>
            
            <p>Thank you for your interest in DocAvailable.</p>
            
            <p>Best regards,<br>
            The DocAvailable Review Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${doctorEmail}</p>
            <p>© 2024 DocAvailable. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Function to send email directly via SMTP
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; message: string }> {
  try {
    // Send email directly using nodemailer
    const info = await transporter.sendMail({
      from: '"DocAvailable" <Docavailable01@gmail.com>',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Fallback: Log the email content for manual sending
    console.log('=== EMAIL TO SEND MANUALLY ===');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('HTML Content:', emailData.html);
    console.log('=== END EMAIL ===');
    
    return { 
      success: false, 
      message: 'Email service temporarily unavailable - doctor status updated successfully' 
    };
  }
}

// Function to send approval email
export async function sendApprovalEmail(doctorName: string, doctorEmail: string): Promise<{ success: boolean; message: string }> {
  const emailTemplate = emailTemplates.approval(doctorName, doctorEmail);
  
  return await sendEmail({
    to: doctorEmail,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    doctorName,
    doctorEmail
  });
}

// Function to send rejection email
export async function sendRejectionEmail(doctorName: string, doctorEmail: string): Promise<{ success: boolean; message: string }> {
  const emailTemplate = emailTemplates.rejection(doctorName, doctorEmail);
  
  return await sendEmail({
    to: doctorEmail,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    doctorName,
    doctorEmail
  });
}
