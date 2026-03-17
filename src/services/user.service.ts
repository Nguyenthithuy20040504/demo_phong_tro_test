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
    if (!email) return null;
    await dbConnect();
    
    const emailLower = email.toLowerCase();
    
    // Tìm trong NguoiDung trước
    const user = await NguoiDung.findOne({ email: emailLower });
    
    if (user) {
      console.log(`User profile found in NguoiDung for ${emailLower}`);
      return {
        _id: user._id,
        name: user.hoTen || user.ten || user.name,
        email: user.email,
        phone: user.soDienThoai || user.phone,
        address: user.address || user.queQuan || '',
        avatar: user.anhDaiDien || user.avatar,
        role: user.vaiTro || user.role,
        createdAt: user.ngayTao || user.createdAt,
        lastLogin: user.lastLogin
      };
    }

    // Nếu không thấy, tìm trong KhachThue
    const client = await KhachThue.findOne({ email: emailLower });
    if (client) {
      console.log(`User profile found in KhachThue for ${emailLower}`);
      return {
        _id: client._id,
        name: client.hoTen,
        email: client.email,
        phone: client.soDienThoai,
        address: client.queQuan || '', 
        avatar: client.anhDaiDien || client.avatar,
        role: 'khachThue',
        createdAt: client.ngayTao || client.createdAt,
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
    
    let result = null;

    // 1. Cập nhật NguoiDung
    const updatedUser = await NguoiDung.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        // Sync both English and Vietnamese fields
        ten: data.name,
        name: data.name,
        soDienThoai: data.phone,
        phone: data.phone,
        address: data.address,
        anhDaiDien: data.avatar,
        avatar: data.avatar,
        updatedAt: new Date(),
        ngayCapNhat: new Date()
      },
      { new: true }
    );

    if (updatedUser) {
      result = {
        _id: updatedUser._id,
        name: updatedUser.ten || updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.soDienThoai || updatedUser.phone,
        address: updatedUser.address,
        avatar: updatedUser.anhDaiDien || updatedUser.avatar,
        role: updatedUser.vaiTro || updatedUser.role,
        createdAt: updatedUser.ngayTao || updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin
      };
    }

    // 2. Cập nhật KhachThue (luôn thử cập nhật nếu email tồn tại trong KhachThue)
    const updatedClient = await KhachThue.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        hoTen: data.name,
        soDienThoai: data.phone,
        anhDaiDien: data.avatar,
        avatar: data.avatar,
        anhCCCD: data.anhCCCD,
        updatedAt: new Date(),
        ngayCapNhat: new Date()
      },
      { new: true }
    );

    if (updatedClient && !result) {
      // Nếu chưa có kết quả từ NguoiDung (user không phải admin/chuNha), dùng kết quả từ KhachThue
      result = {
        _id: updatedClient._id,
        name: updatedClient.hoTen,
        email: updatedClient.email,
        phone: updatedClient.soDienThoai,
        address: updatedClient.queQuan || '',
        avatar: updatedClient.anhDaiDien || updatedClient.avatar,
        anhCCCD: updatedClient.anhCCCD,
        role: 'khachThue',
        createdAt: updatedClient.ngayTao || updatedClient.createdAt,
        lastLogin: updatedClient.lastLogin
      };
    }

    return result;
  }

  /**
   * Đổi mật khẩu
   */
  static async changePassword(email: string, data: any) {
    try {
      await dbConnect();
      
      const emailLower = email.toLowerCase();
      
      // Tìm trong NguoiDung trước
      let user = await NguoiDung.findOne({ email: emailLower }).select('+matKhau +password');
      let isKhachThue = false;
      
      if (!user) {
        user = await KhachThue.findOne({ email: emailLower }).select('+matKhau');
        isKhachThue = true;
      }
      
      if (!user) {
        return { success: false, message: 'Không tìm thấy người dùng' };
      }
      
      let isMatch = false;
      
      if (typeof user.comparePassword === 'function') {
        isMatch = await user.comparePassword(data.currentPassword);
      } else {
        const bcrypt = require('bcryptjs');
        const passwordToCheck = user.matKhau || user.password;
        if (passwordToCheck) {
             isMatch = await bcrypt.compare(data.currentPassword, passwordToCheck);
        }
      }
      
      if (!isMatch) {
         return { success: false, message: 'Mật khẩu hiện tại không đúng' };
      }
      
      // Update password fields that exist
      if (user.matKhau !== undefined || isKhachThue) {
         user.matKhau = data.newPassword;
      }
      // NguoiDung has 'password' field too
      if (!isKhachThue && user.password !== undefined) {
         user.password = data.newPassword;
      }
      
      await user.save();
      return { success: true, message: 'Đổi mật khẩu thành công' };
      
    } catch (error) {
       console.error('Error changing password:', error);
       return { success: false, message: 'Lỗi server khi đổi mật khẩu' };
    }
  }
}
