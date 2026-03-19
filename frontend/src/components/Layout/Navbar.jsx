import { Link } from 'react-router-dom';
import { Bell, LogOut } from '../Icons';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useEffect, useRef, useState } from 'react';
import { onNotification, offNotification } from '../../lib/socket';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    addNotification,
    markAsRead,
    markAllAsRead
  } = useNotificationStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationPanelRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleIncomingNotification = (notification) => {
      addNotification(notification);
    };

    onNotification(handleIncomingNotification);
    return () => {
      offNotification(handleIncomingNotification);
    };
  }, [addNotification]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const notificationPreview = notifications.slice(0, 6);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsNotificationOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          <span className="navbar-logo-mark" aria-hidden="true">PH</span>
          <span>ProjectHub</span>
        </Link>

        <div className="navbar-right">
          {/* Notifications */}
          <div className="notification-wrap" ref={notificationPanelRef}>
            <button
              type="button"
              className="notification-btn"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <h3>Notifications</h3>
                  <button
                    type="button"
                    className="notification-mark-all"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all
                  </button>
                </div>

                {notificationPreview.length === 0 ? (
                  <p className="notification-empty">No notifications yet.</p>
                ) : (
                  <div className="notification-panel-list">
                    {notificationPreview.map((notification) => (
                      <Link
                        key={notification.id}
                        to={notification.relatedProjectId ? `/projects/${notification.relatedProjectId}` : '/dashboard'}
                        className={`notification-item ${notification.read ? '' : 'notification-item-unread'}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p className="notification-item-message">{notification.message}</p>
                        <p className="notification-item-time">{new Date(notification.createdAt).toLocaleString()}</p>
                      </Link>
                    ))}
                  </div>
                )}

                <Link to="/notifications" className="notification-view-all" onClick={() => setIsNotificationOpen(false)}>
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="user-menu">
            <div className="user-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || 'User avatar'} className="user-avatar-image" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="user-name">{user?.name}</span>
          </div>

          <button
            onClick={logout}
            className="logout-btn"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
