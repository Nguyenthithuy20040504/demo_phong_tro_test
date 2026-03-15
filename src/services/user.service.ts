import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import KhachThue from '@/models/KhachThue';
import { UserProfileInput } from '@/validations/user.schema';

export class UserService {
  /**
   * Cập nhật thời gian đăng nhập cuối
   */
  static async updateLastLogin(userId: string, role: string) {
    try {
      await dbConnect();
      const now = new Date();
      console.log(`Updating lastLogin for user ${userId} with role ${role}`);
      
      if (role === 'khachThue') {
        const result = await KhachThue.findByIdAndUpdate(userId, { lastLogin: now });
        console.log(`Update result for khachThue: ${result ? 'Success' : 'Not found'}`);
        return result;
      } else {
        const result = await NguoiDung.findByIdAndUpdate(userId, { lastLogin: now });
        console.log(`Update result for nguoiDung: ${result ? 'Success' : 'Not found'}`);
        return result;
      }
    } catch (error) {
      console.error('Error updating lastLogin:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin hồ sơ người dùng theo email
   */
  static async getUserProfile(email: string) {
    await dbConnect();
    
    // Tìm trong NguoiDung trước
    const user = await NguoiDung.findOne({ email });
    
    if (user) {
      console.log(`User profile found for ${email}`);
      return {
        _id: user._id,
        name: user.hoTen || user.name || user.ten,
        email: user.email,
        phone: user.soDienThoai || user.phone,
        address: user.address || user.queQuan || '',
        avatar: user.anhDaiDien || user.avatar,
        role: user.role || user.vaiTro,
        createdAt: user.createdAt || user.ngayTao,
        lastLogin: user.lastLogin
      };
    }
    console.log(`User profile NOT found for ${email}`);

    // Nếu không thấy, tìm trong KhachThue
    const client = await KhachThue.findOne({ email });
    if (client) {
      return {
        _id: client._id,
        name: client.hoTen,
        email: client.email,
        phone: client.soDienThoai,
        address: '', // KhachThue model currenty doesn't have address field
        avatar: null,
        role: 'khachThue',
        createdAt: client.createdAt || client.ngayTao,
        lastLogin: client.lastLogin
      };
    }

    return null;
  }

  /**
   * Cập nhật thông tin hồ sơ
   */
  static async updateProfile(email: string, data: UserProfileInput) {
    await dbConnect();
    
    // Cập nhật NguoiDung
    const updatedUser = await NguoiDung.findOneAndUpdate(
      { email },
      { 
        name: data.name,
        phone: data.phone,
        address: data.address,
        avatar: data.avatar,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (updatedUser) {
      return {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin
      };
    }

    // Nếu không phải NguoiDung, thử cập nhật KhachThue (chỉ cập nhật một số trường cho phép)
    const updatedClient = await KhachThue.findOneAndUpdate(
      { email },
      {
        hoTen: data.name,
        soDienThoai: data.phone,
        // Khách thuê có thể có giới hạn về các trường được phép sửa qua API này
      },
      { new: true }
    );

    if (updatedClient) {
      return {
        _id: updatedClient._id,
        name: updatedClient.hoTen,
        email: updatedClient.email,
        phone: updatedClient.soDienThoai,
        address: '',
        avatar: null,
        role: 'khachThue',
        createdAt: updatedClient.createdAt,
        lastLogin: updatedClient.lastLogin
      };
    }

    return null;
  }

  /**
   * Đổi mật khẩu
   */
  static async changePassword(email: string, data: any) {
    try {
      await dbConnect();
      
      // Tìm trong NguoiDung trước
      let user = await NguoiDung.findOne({ email });
      let isKhachThue = false;
      
      if (!user) {
        user = await KhachThue.findOne({ email });
        isKhachThue = true;
      }
      
      if (!user) {
        return { success: false, message: 'Không tìm thấy người dùng' };
      }
      
      // KhachThue schema might be different. Checking if it has comparePassword method.
      // If not, we might need a custom compare logic for KhachThue or assume it uses standard bcrypt
      let isMatch = false;
      
      if (typeof user.comparePassword === 'function') {
        isMatch = await user.comparePassword(data.currentPassword);
      } else {
        // Fallback or specific logic for KhachThue if comparePassword isn't defined
        const bcrypt = require('bcryptjs');
        const passwordToCheck = user.matKhau || user.password;
        if (passwordToCheck) {
             isMatch = await bcrypt.compare(data.currentPassword, passwordToCheck);
        }
      }
      
      if (!isMatch) {
         return { success: false, message: 'Mật khẩu hiện tại không đúng' };
      }
      
      // Update password
      if (user.matKhau !== undefined) {
         user.matKhau = data.newPassword;
      }
      if (user.password !== undefined) {
         user.password = data.newPassword;
      }
      
      await user.save();
      return { success: true, message: 'Đổi mật khẩu thành công' };
      
    } catch (error) {
       console.error('Error changing password:', error);
       return { success: false, message: 'Lỗi server' };
    }
  }
}
