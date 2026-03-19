import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile, uploadProfilePicture } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', avatar: '', bio: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        avatar: user.avatar || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    const result = await updateProfile(formData);

    if (result.success) {
      setMessage('Profile updated successfully');
    } else {
      setMessage(result.error || 'Failed to update profile');
    }

    setIsSaving(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handlePictureUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a picture first');
      return;
    }

    setIsUploading(true);
    setMessage('');

    const result = await uploadProfilePicture(selectedFile);

    if (result.success) {
      setFormData((prev) => ({ ...prev, avatar: result.user.avatar || '' }));
      setSelectedFile(null);
      setMessage('Profile picture uploaded successfully');
    } else {
      setMessage(result.error || 'Failed to upload profile picture');
    }

    setIsUploading(false);
  };

  const avatarPreview = formData.avatar?.trim() || '';

  return (
    <div className="profile-container">
      <h1 className="page-title">Profile</h1>
      
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="profile-avatar-image" />
            ) : (
              formData.name?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div>
            <h2 className="profile-name">{formData.name || user?.name}</h2>
            <p className="profile-email">{user?.email}</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              className="input"
              onChange={handleChange}
              placeholder="Enter your name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              className="input"
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Avatar URL</label>
            <input
              type="text"
              name="avatar"
              value={formData.avatar}
              className="input"
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Profile Picture</label>
            <div className="profile-upload-row">
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePictureUpload}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? 'Uploading...' : 'Upload Picture'}
              </button>
            </div>
            <p className="profile-upload-note">Max file size: 5MB. Supported: image files only.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              className="input"
              rows="4"
              onChange={handleChange}
              placeholder="Write a short bio"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              value={user?.role || ''}
              className="input"
              readOnly
            />
          </div>

          {message && <p className="profile-message">{message}</p>}

          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
