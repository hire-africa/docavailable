import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { status, completed_by } = await request.json();

    if (!status || !['completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status. Must be "completed" or "failed"' },
        { status: 400 }
      );
    }

    // For completed status, require completed_by
    if (status === 'completed' && !completed_by) {
      return NextResponse.json(
        { message: 'completed_by is required for completed status' },
        { status: 400 }
      );
    }

    // Get the actual admin user ID from the database if completed_by is provided
    let adminUserId = null;
    if (completed_by) {
      // Map hardcoded admin IDs to actual user IDs in the database
      const adminEmailMap: { [key: string]: string } = {
        'admin-1': 'blacksleeky84@gmail.com',
        'admin-2': 'admin@docavailable.com', 
        'admin-3': 'macnyoni4@gmail.com'
      };
      
      const adminEmail = adminEmailMap[completed_by];
      if (adminEmail) {
        try {
          const adminQuery = `SELECT id FROM users WHERE email = $1 AND user_type = 'admin'`;
          const adminResult = await query(adminQuery, [adminEmail]);
          if (adminResult.rows.length > 0) {
            adminUserId = adminResult.rows[0].id;
          } else {
            console.log(`Admin user not found in database for email: ${adminEmail}. Proceeding with NULL paid_by.`);
            // Continue with adminUserId = null (will be stored as NULL in database)
          }
        } catch (error) {
          console.log(`Error looking up admin user: ${error instanceof Error ? error.message : 'Unknown error'}. Proceeding with NULL paid_by.`);
          // Continue with adminUserId = null (will be stored as NULL in database)
        }
      } else {
        return NextResponse.json(
          { message: 'Invalid admin ID provided' },
          { status: 400 }
        );
      }
    }

    // First, get the withdrawal request details from withdrawal_requests
    const getRequestQuery = `
      SELECT 
        wr.*,
        u.first_name,
        u.last_name,
        u.email
      FROM withdrawal_requests wr
      LEFT JOIN users u ON wr.doctor_id = u.id
      WHERE wr.id = $1
    `;

    const requestResult = await query(getRequestQuery, [id]);
    
    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Withdrawal request not found' },
        { status: 404 }
      );
    }

    const withdrawalRequest = requestResult.rows[0];

    // Update the withdrawal request status
    const updateRequestQuery = `
      UPDATE withdrawal_requests 
      SET status = $1, updated_at = NOW(), paid_by = $3, paid_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    await query(updateRequestQuery, [status, id, adminUserId]);

    // If status is completed, we need to update the doctor's wallet
    if (status === 'completed') {
      // First, check if the doctor has a wallet
      const walletQuery = `
        SELECT id, balance FROM doctor_wallets 
        WHERE doctor_id = $1
      `;
      
      const walletResult = await query(walletQuery, [withdrawalRequest.doctor_id]);
      
      if (walletResult.rows.length === 0) {
        // Create a new wallet for the doctor if it doesn't exist
        const createWalletQuery = `
          INSERT INTO doctor_wallets (doctor_id, balance, created_at, updated_at)
          VALUES ($1, 0, NOW(), NOW())
          RETURNING id
        `;
        await query(createWalletQuery, [withdrawalRequest.doctor_id]);
      }

      // Update the doctor's wallet balance (subtract the withdrawal amount)
      const updateWalletQuery = `
        UPDATE doctor_wallets 
        SET balance = balance - $1, updated_at = NOW()
        WHERE doctor_id = $2
      `;
      
      await query(updateWalletQuery, [withdrawalRequest.amount, withdrawalRequest.doctor_id]);

      // Add a transaction record to the wallet transactions
      const addTransactionQuery = `
        INSERT INTO wallet_transactions (
          doctor_id,
          type, 
          amount, 
          description, 
          status, 
          created_at, 
          updated_at
        )
        VALUES (
          $3,
          'debit',
          $1,
          'Withdrawal processed - ' || $2,
          'completed',
          NOW(),
          NOW()
        )
      `;
      
      await query(addTransactionQuery, [
        withdrawalRequest.amount,
        withdrawalRequest.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
        withdrawalRequest.payment_method === 'mobile_money' ? 'Mobile Money' : 'Mzunguko',
        withdrawalRequest.doctor_id
      ]);

      // Send email notification to doctor
      try {
        const emailResponse = await fetch(`${process.env.BACKEND_URL}/api/admin/withdrawal-requests/send-completion-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'your-admin-token'}` // You'll need to set this in your .env
          },
          body: JSON.stringify({
            doctor_email: withdrawalRequest.email,
            doctor_name: `${withdrawalRequest.first_name} ${withdrawalRequest.last_name}`,
            amount: withdrawalRequest.amount,
            payment_method: withdrawalRequest.payment_method,
            bank_name: withdrawalRequest.bank_name,
            account_holder_name: withdrawalRequest.account_holder_name,
            completed_at: new Date().toISOString()
          })
        });

        if (emailResponse.ok) {
          console.log('Withdrawal completion email sent successfully');
        } else {
          console.error('Failed to send withdrawal completion email:', await emailResponse.text());
        }
      } catch (error) {
        console.error('Error sending withdrawal completion email:', error);
        // Don't fail the withdrawal completion if email fails
      }
    }

    return NextResponse.json({
      message: `Withdrawal request ${status} successfully`,
      status: status
    });
  } catch (error) {
    console.error('Withdrawal request status update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
