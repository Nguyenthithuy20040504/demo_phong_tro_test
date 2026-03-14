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
}
