import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import './Notifications.css';

const notificationLink = (notification) => {
  if (notification?.relatedProjectId) {
    return `/projects/${notification.relatedProjectId}`;
  }
  return '/dashboard';
};

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="notifications-page card">
      <div className="notifications-header-row">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="notifications-subtitle">Project invites, task assignments, and team updates.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          Mark All Read
        </button>
      </div>

      {isLoading ? (
        <p className="notifications-empty">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="notifications-empty">No notifications yet.</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${notification.read ? '' : 'notification-card-unread'}`}
            >
              <div className="notification-main">
                <p className="notification-message">{notification.message}</p>
                <p className="notification-time">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              <div className="notification-actions">
                <Link to={notificationLink(notification)} className="btn btn-secondary">
                  Open
                </Link>
                {!notification.read && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Mark Read
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteNotification(notification.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;