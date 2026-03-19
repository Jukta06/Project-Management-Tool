import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import {
  requestPresence,
  onPresenceSnapshot,
  offPresenceSnapshot,
  onPresenceChanged,
  offPresenceChanged,
  onNotification,
  offNotification
} from '../../lib/socket';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const {
    currentProject,
    fetchProject,
    updateProjectBoards,
    inviteMemberByEmail,
    fetchProjectInvites,
    approveProjectInvite,
    rejectProjectInvite
  } = useProjectStore();
  const {
    tasks,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    fetchTaskComments,
    createTaskComment,
    uploadTaskAttachment
  } = useTaskStore();
  const { user } = useAuthStore();
  const [presenceMap, setPresenceMap] = useState({});
  const [editableBoards, setEditableBoards] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnsMessage, setColumnsMessage] = useState('');
  const [isSavingColumns, setIsSavingColumns] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    board: 'To Do',
    priority: 'medium',
    dueDate: '',
    subtasks: [],
    assignedTo: []
  });
  const [subtaskInput, setSubtaskInput] = useState('');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const backendBaseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

  const normalizeAttachments = useCallback((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchTasks(id);
    }
  }, [fetchProject, fetchTasks, id]);

  useEffect(() => {
    if (!id) return undefined;

    const intervalId = setInterval(() => {
      fetchTasks(id);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchTasks, id]);

  useEffect(() => {
    const boards = Array.isArray(currentProject?.boards) ? currentProject.boards : [];
    const normalized = [...boards]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((board, index) => ({ name: board.name, order: index }));
    setEditableBoards(normalized);
  }, [currentProject?.boards]);

  const memberDetails = useMemo(
    () => currentProject?.memberDetails || [],
    [currentProject?.memberDetails]
  );
  const isOwnerUser = Number(user?.id) === Number(currentProject?.ownerId);
  const assignableMembers = useMemo(
    () => memberDetails.filter((member) => Number(member.id) !== Number(currentProject?.ownerId)),
    [currentProject?.ownerId, memberDetails]
  );

  const memberIds = useMemo(
    () => memberDetails.map((member) => member.id),
    [memberDetails]
  );

  useEffect(() => {
    if (memberIds.length === 0) return;

    const handleSnapshot = (presenceList) => {
      const next = {};
      (presenceList || []).forEach((item) => {
        next[item.userId] = item;
      });
      setPresenceMap(next);
    };

    const handleChange = (item) => {
      setPresenceMap((prev) => ({
        ...prev,
        [item.userId]: item
      }));
    };

    onPresenceSnapshot(handleSnapshot);
    onPresenceChanged(handleChange);
    requestPresence(memberIds);

    return () => {
      offPresenceSnapshot(handleSnapshot);
      offPresenceChanged(handleChange);
    };
  }, [memberIds]);

  useEffect(() => {
    const handleNotification = async (notification) => {
      console.log('🔔 New notification received:', notification);
      if (notification?.type === 'file_uploaded' || /uploaded a file/i.test(notification?.message || '')) {
        toast.success(notification.message);
        if (id) {
          await fetchTasks(id);
        }
        if (editingTask?.id) {
          const refreshed = await fetchTask(editingTask.id);
          if (refreshed?.success) {
            setEditingTask(refreshed.task);
          }
        }
      } else if (notification?.type === 'task_assigned') {
        toast.info(notification.message);
      }
    };

    onNotification(handleNotification);
    return () => {
      offNotification(handleNotification);
    };
  }, [fetchTask, fetchTasks, id, editingTask?.id]);

  useEffect(() => {
    if (!showTaskModal || !editingTask?.id) return undefined;

    const syncModalTask = async () => {
      const refreshed = await fetchTask(editingTask.id);
      if (refreshed?.success) {
        setEditingTask(refreshed.task);
      }
    };

    // Sync once immediately and then keep it fresh while modal is open.
    syncModalTask();
    const intervalId = setInterval(syncModalTask, 5000);

    return () => clearInterval(intervalId);
  }, [showTaskModal, editingTask?.id, fetchTask]);

  const loadPendingInvites = useCallback(async () => {
    setIsLoadingInvites(true);
    const result = await fetchProjectInvites(id, 'pending');
    if (result.success) {
      setPendingInvites(result.invites || []);
    }
    setIsLoadingInvites(false);
  }, [fetchProjectInvites, id]);

  const loadTaskComments = async (taskId) => {
    setIsLoadingComments(true);
    const result = await fetchTaskComments(taskId);
    if (result.success) {
      setComments(result.comments || []);
    } else {
      toast.error(result.error || 'Failed to load comments');
    }
    setIsLoadingComments(false);
  };

  const commentTree = useMemo(() => {
    const map = new Map();
    const roots = [];

    comments.forEach((comment) => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    map.forEach((node) => {
      if (node.parentCommentId && map.has(node.parentCommentId)) {
        map.get(node.parentCommentId).replies.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNested = (nodes) => nodes
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((node) => ({ ...node, replies: sortNested(node.replies || []) }));

    return sortNested(roots);
  }, [comments]);

  useEffect(() => {
    if (id) {
      loadPendingInvites();
    }
  }, [id, loadPendingInvites]);

  if (!currentProject) {
    return <div className="loading-state">Loading...</div>;
  }

  const orderedBoards = [...editableBoards].sort((a, b) => a.order - b.order);
  const isArchived = currentProject.status === 'archived';

  const tasksByBoard = {};
  orderedBoards.forEach(board => {
    tasksByBoard[board.name] = tasks
      .filter(task => task.board === board.name)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const renameColumn = (index, value) => {
    setEditableBoards((prev) =>
      prev.map((board, i) => (i === index ? { ...board, name: value } : board))
    );
  };

  const moveColumn = (index, direction) => {
    setEditableBoards((prev) => {
      const next = [...prev].sort((a, b) => a.order - b.order);
      const target = direction === 'left' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;

      [next[index], next[target]] = [next[target], next[index]];
      return next.map((board, order) => ({ ...board, order }));
    });
  };

  const addColumn = () => {
    if (isArchived) {
      setColumnsMessage('Archived project columns cannot be changed');
      return;
    }

    const name = newColumnName.trim();
    if (!name) {
      setColumnsMessage('Column name is required');
      return;
    }

    const exists = editableBoards.some((board) => board.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setColumnsMessage('Column name already exists');
      return;
    }

    setEditableBoards((prev) => [
      ...prev,
      { name, order: prev.length }
    ]);
    setNewColumnName('');
    setColumnsMessage('');
  };

  const saveColumns = async () => {
    if (isArchived) {
      setColumnsMessage('Archived project columns cannot be changed');
      return;
    }

    const normalized = orderedBoards
      .map((board, order) => ({ name: board.name.trim(), order }))
      .filter((board) => board.name.length > 0);

    if (normalized.length === 0) {
      setColumnsMessage('At least one column is required');
      return;
    }

    const uniqueNames = new Set(normalized.map((board) => board.name.toLowerCase()));
    if (uniqueNames.size !== normalized.length) {
      setColumnsMessage('Column names must be unique');
      return;
    }

    setIsSavingColumns(true);
    setColumnsMessage('');
    const result = await updateProjectBoards(id, normalized);
    if (result.success) {
      setColumnsMessage('Columns updated successfully');
      await fetchTasks(id);
    } else {
      setColumnsMessage(result.error || 'Failed to update columns');
    }
    setIsSavingColumns(false);
  };

  const openCreateTaskModal = (boardName) => {
    if (isArchived) {
      toast.error('Archived project is read-only');
      return;
    }

    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      board: boardName,
      priority: 'medium',
      dueDate: '',
      subtasks: [],
      assignedTo: []
    });
    setSubtaskInput('');
    setShowMarkdownPreview(false);
    setShowTaskModal(true);
    setComments([]);
    setNewCommentText('');
    setReplyDrafts({});
  };

  const openEditTaskModal = async (task) => {
    if (isArchived) {
      toast.error('Archived project is read-only');
      return;
    }

    const taskResult = await fetchTask(task.id);
    const modalTask = taskResult?.success ? taskResult.task : task;

    setEditingTask(modalTask);
    setTaskForm({
      title: modalTask.title || '',
      description: modalTask.description || '',
      board: modalTask.board || orderedBoards[0]?.name || 'To Do',
      priority: modalTask.priority || 'medium',
      dueDate: modalTask.dueDate ? String(modalTask.dueDate).slice(0, 10) : '',
      subtasks: Array.isArray(modalTask.subtasks) ? modalTask.subtasks : [],
      assignedTo: Array.isArray(modalTask.assignedTo) ? modalTask.assignedTo.map(Number) : []
    });
    setSubtaskInput('');
    setShowMarkdownPreview(false);
    setShowTaskModal(true);
    loadTaskComments(modalTask.id);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setComments([]);
    setNewCommentText('');
    setReplyDrafts({});
  };

  const addSubtaskToForm = () => {
    const text = subtaskInput.trim();
    if (!text) return;

    setTaskForm((prev) => ({
      ...prev,
      subtasks: [
        ...(prev.subtasks || []),
        { id: `sub-${Date.now()}`, text, completed: false }
      ]
    }));
    setSubtaskInput('');
  };

  const toggleSubtaskInForm = (subtaskId) => {
    setTaskForm((prev) => ({
      ...prev,
      subtasks: (prev.subtasks || []).map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
      )
    }));
  };

  const removeSubtaskFromForm = (subtaskId) => {
    setTaskForm((prev) => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter((subtask) => subtask.id !== subtaskId)
    }));
  };

  const saveTask = async (e) => {
    e.preventDefault();

    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    const sanitizedAssignedTo = isOwnerUser
      ? (taskForm.assignedTo || [])
        .map(Number)
        .filter((memberId) => assignableMembers.some((member) => Number(member.id) === memberId))
      : (editingTask?.assignedTo || []);

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description,
      board: taskForm.board,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || null,
      subtasks: taskForm.subtasks || [],
      assignedTo: sanitizedAssignedTo
    };

    let result;
    if (editingTask) {
      result = await updateTask(editingTask.id, payload);
    } else {
      result = await createTask({ ...payload, project: Number(id) });
    }

    if (result.success) {
      toast.success(editingTask ? 'Task updated' : 'Task created');
      closeTaskModal();
      await fetchTasks(id);
    } else {
      toast.error(result.error || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (isArchived) {
      toast.error('Archived project is read-only');
      return;
    }

    const result = await deleteTask(taskId);
    if (result.success) {
      toast.success('Task deleted');
      await fetchTasks(id);
    } else {
      toast.error(result.error || 'Failed to delete task');
    }
  };

  const onDragEnd = async (result) => {
    if (isArchived) return;
    if (!result.destination) return;

    const { source, destination } = result;
    if (
      source.droppableId === destination.droppableId
      && source.index === destination.index
    ) {
      return;
    }

    const sourceTasks = tasksByBoard[source.droppableId] || [];
    const movedTask = sourceTasks[source.index];
    if (!movedTask) return;

    const moveResult = await moveTask(movedTask.id, destination.droppableId, destination.index);
    if (!moveResult.success) {
      toast.error(moveResult.error || 'Failed to move task');
      return;
    }

    await fetchTasks(id);
  };

  const toggleAssignee = (memberId) => {
    if (!isOwnerUser) return;
    setTaskForm((prev) => {
      const exists = (prev.assignedTo || []).includes(memberId);
      return {
        ...prev,
        assignedTo: exists
          ? prev.assignedTo.filter((idValue) => idValue !== memberId)
          : [...(prev.assignedTo || []), memberId]
      };
    });
  };


  const selectAllAssignees = () => {
    if (!isOwnerUser) return;
    setTaskForm((prev) => ({
      ...prev,
      assignedTo: assignableMembers.map((member) => Number(member.id))
    }));
  };

  const clearAssignees = () => {
    if (!isOwnerUser) return;
    setTaskForm((prev) => ({
      ...prev,
      assignedTo: []
    }));
  };
  const submitInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Email is required');
      return;
    }

    const result = await inviteMemberByEmail(id, email, 'member');
    if (result.success) {
      toast.success(result.message || 'Invite sent');
      setInviteEmail('');
      await loadPendingInvites();
      await fetchProject(id);
    } else {
      toast.error(result.error || 'Failed to send invite');
    }
  };

  const handleApproveInvite = async (inviteId) => {
    const result = await approveProjectInvite(id, inviteId);
    if (result.success) {
      toast.success(result.message || 'Invite approved');
      await loadPendingInvites();
      await fetchProject(id);
    } else {
      toast.error(result.error || 'Failed to approve invite');
    }
  };

  const handleRejectInvite = async (inviteId) => {
    const result = await rejectProjectInvite(id, inviteId);
    if (result.success) {
      toast.success(result.message || 'Invite rejected');
      await loadPendingInvites();
    } else {
      toast.error(result.error || 'Failed to reject invite');
    }
  };

  const submitRootComment = async () => {
    if (!editingTask) return;
    const content = newCommentText.trim();
    if (!content) return;

    const result = await createTaskComment({
      taskId: editingTask.id,
      content
    });

    if (result.success) {
      setComments((prev) => [...prev, result.comment]);
      setNewCommentText('');
    } else {
      toast.error(result.error || 'Failed to post comment');
    }
  };

  const submitReply = async (parentCommentId) => {
    if (!editingTask) return;
    const content = String(replyDrafts[parentCommentId] || '').trim();
    if (!content) return;

    const result = await createTaskComment({
      taskId: editingTask.id,
      content,
      parentCommentId
    });

    if (result.success) {
      setComments((prev) => [...prev, result.comment]);
      setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: '' }));
    } else {
      toast.error(result.error || 'Failed to post reply');
    }
  };

  const handleFileUpload = async (e) => {
    if (!editingTask) return;
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', file.name, 'Size:', file.size);

    // Check file size (25MB limit)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 25MB');
      console.error('File size exceeded 25MB:', file.size);
      return;
    }

    setIsUploadingFile(true);
    try {
      console.log('⬆️ Uploading file to task:', editingTask.id);
      const result = await uploadTaskAttachment(editingTask.id, file);
      console.log('📤 Upload response:', result);

      if (!result.success) {
        throw new Error(result.error || 'File upload failed');
      }

      console.log('✅ Upload successful! Updated task:', result.task);
      setEditingTask(result.task);
      await fetchTasks(id);
     
      toast.success('File uploaded successfully');
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('❌ File upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const renderCommentNode = (comment, depth = 0) => {
    const replyValue = replyDrafts[comment.id] || '';
    return (
      <div key={comment.id} className="comment-node" style={{ marginLeft: `${Math.min(depth, 4) * 1.25}rem` }}>
        <div className="comment-header">
          <span className="comment-author">{comment.author?.name || 'Unknown user'}</span>
          <span className="comment-time">{new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <p className="comment-content">{comment.content}</p>
        <div className="reply-row">
          <input
            type="text"
            className="input"
            placeholder="Write a reply"
            value={replyValue}
            onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
          />
          <button type="button" className="btn btn-secondary" onClick={() => submitReply(comment.id)}>
            Reply
          </button>
        </div>
        {(comment.replies || []).map((reply) => renderCommentNode(reply, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="project-header">
        <h1 className="page-title">{currentProject.title}</h1>
        <p className="project-description">{currentProject.description}</p>
      </div>

      <div className="columns-section">
        <h2 className="columns-title">Column Management</h2>
        <div className="columns-list">
          {orderedBoards.map((board, index) => (
            <div key={`${board.name}-${index}`} className="column-item">
              <input
                type="text"
                className="input"
                value={board.name}
                onChange={(e) => renameColumn(index, e.target.value)}
                placeholder="Column name"
                disabled={isArchived}
              />
              <div className="column-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => moveColumn(index, 'left')}
                  disabled={index === 0 || isArchived}
                >
                  Left
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => moveColumn(index, 'right')}
                  disabled={index === orderedBoards.length - 1 || isArchived}
                >
                  Right
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="add-column-row">
          <input
            type="text"
            className="input"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New column name"
            disabled={isArchived}
          />
          <button type="button" className="btn btn-primary" onClick={addColumn} disabled={isArchived}>
            Add Column
          </button>
        </div>

        {columnsMessage && <p className="columns-message">{columnsMessage}</p>}

        <button
          type="button"
          className="btn btn-primary"
          onClick={saveColumns}
          disabled={isSavingColumns || isArchived}
        >
          {isSavingColumns ? 'Saving...' : 'Save Columns'}
        </button>
      </div>

      <div className="members-section">
        <h2 className="members-title">Team Presence</h2>
        <form className="invite-row" onSubmit={submitInvite}>
          <input
            type="email"
            className="input"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Invite by email"
          />
          <button type="submit" className="btn btn-primary">Invite</button>
        </form>

        <div className="invite-help">
          Owner invites are added instantly. Member invites require owner approval.
        </div>

        <div className="members-list">
          {memberDetails.map((member) => {
            const presence = presenceMap[member.id] || { isOnline: false, lastSeen: null };
            const avatarInitial = member.name?.charAt(0)?.toUpperCase() || '?';

            return (
              <div key={member.id} className="member-item">
                <div className="member-avatar-wrapper">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="member-avatar" />
                  ) : (
                    <div className="member-avatar member-avatar-fallback">{avatarInitial}</div>
                  )}
                  <span
                    className={`presence-dot ${presence.isOnline ? 'online' : 'offline'}`}
                    title={presence.isOnline ? 'Online' : 'Offline'}
                  />
                </div>

                <div className="member-info">
                  <p className="member-name">{member.name}</p>
                  <p className="member-status">
                    {presence.isOnline ? 'Online now' : (presence.lastSeen ? `Last seen: ${new Date(presence.lastSeen).toLocaleString()}` : 'Offline')}
                  </p>
                </div>

                <span className="member-role">{member.role}</span>
              </div>
            );
          })}
        </div>

        <div className="pending-invites-section">
          <h3 className="pending-title">Pending Invite Requests</h3>
          {isLoadingInvites ? (
            <p className="pending-empty">Loading...</p>
          ) : pendingInvites.length === 0 ? (
            <p className="pending-empty">No pending invites</p>
          ) : (
            <div className="pending-list">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="pending-item">
                  <div>
                    <p className="pending-email">{invite.email}</p>
                    <p className="pending-meta">Requested by: {invite.invitedBy?.name || 'Unknown'}</p>
                  </div>
                  {isOwnerUser ? (
                    <div className="pending-actions">
                      <button type="button" className="btn btn-primary" onClick={() => handleApproveInvite(invite.id)}>
                        Approve
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => handleRejectInvite(invite.id)}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="pending-waiting">Waiting owner approval</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="boards-container">
          {orderedBoards.map((board) => (
            <div key={board.name} className="board">
              <div className="board-header">
                <h3 className="board-title">
                  {board.name} ({tasksByBoard[board.name]?.length || 0})
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openCreateTaskModal(board.name)}
                  disabled={isArchived}
                >
                  + Task
                </button>
              </div>
              <Droppable droppableId={board.name}>
                {(provided, snapshot) => (
                  <div
                    className={`tasks-container ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {tasksByBoard[board.name]?.map((task, index) => {
                      const completedSubtasks = (task.subtasks || []).filter((subtask) => subtask.completed).length;
                      const totalSubtasks = (task.subtasks || []).length;
                      const taskAttachments = normalizeAttachments(task.attachments);

                      return (
                        <Draggable key={String(task.id)} draggableId={String(task.id)} index={index} isDragDisabled={isArchived}>
                          {(dragProvided) => (
                            <div
                              className="task-card"
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <h4 className="task-title">{task.title}</h4>
                              <div className="task-description-markdown">
                                <ReactMarkdown>{task.description || ''}</ReactMarkdown>
                              </div>
                              <div className="task-meta">
                                <span className={`priority-badge priority-${task.priority}`}>
                                  {task.priority}
                                </span>
                                {task.dueDate && (
                                  <span className="task-due-date">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                )}
                              </div>
                              {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
                                <div className="assignee-chip-list">
                                  {task.assignedTo.map((assigneeId) => {
                                    const member = memberDetails.find((m) => Number(m.id) === Number(assigneeId));
                                    return (
                                      <span key={`${task.id}-${assigneeId}`} className="assignee-chip">
                                        {member?.name || `User #${assigneeId}`}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {totalSubtasks > 0 && (
                                <p className="subtask-progress">
                                  Subtasks: {completedSubtasks}/{totalSubtasks}
                                </p>
                              )}
                              {taskAttachments.length > 0 && (
                                <div className="task-attachments-inline">
                                  <p className="subtask-progress">Attachments: {taskAttachments.length}</p>
                                  {taskAttachments.slice(0, 2).map((attachment, attachmentIndex) => {
                                    const attachmentUrl = String(attachment.url || '').startsWith('http')
                                      ? attachment.url
                                      : `${backendBaseUrl}${attachment.url}`;
                                    const uploadedAtText = attachment.uploadedAt
                                      ? new Date(attachment.uploadedAt).toLocaleString('en-US')
                                      : '';

                                    return (
                                      <div key={`${task.id}-${attachmentIndex}`} className="task-attachment-item-inline">
                                        <a
                                          href={attachmentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="attachment-link"
                                          title={attachment.filename}
                                        >
                                          📄 {attachment.filename}
                                        </a>
                                        <span className="attachment-date">{uploadedAtText}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="task-card-actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => openEditTaskModal(task)}
                                  disabled={isArchived}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={isArchived}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal task-modal">
            <h2 className="modal-title">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
            <form onSubmit={saveTask} className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="input"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Column</label>
                <select
                  className="input"
                  value={taskForm.board}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, board: e.target.value }))}
                >
                  {orderedBoards.map((board) => (
                    <option key={board.name} value={board.name}>{board.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Markdown)</label>
                <textarea
                  className="input"
                  rows={5}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={'Use markdown, e.g. **bold**, - list, `code`'}
                />
                <button
                  type="button"
                  className="btn btn-secondary markdown-preview-btn"
                  onClick={() => setShowMarkdownPreview((prev) => !prev)}
                >
                  {showMarkdownPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                {showMarkdownPreview && (
                  <div className="markdown-preview">
                    <ReactMarkdown>{taskForm.description || 'No description'}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="task-form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="input"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Med</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sub-tasks</label>
                <div className="subtask-input-row">
                  <input
                    type="text"
                    className="input"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    placeholder="Add sub-task"
                  />
                  <button type="button" className="btn btn-secondary" onClick={addSubtaskToForm}>Add</button>
                </div>
                <div className="subtask-list">
                  {(taskForm.subtasks || []).map((subtask) => (
                    <div key={subtask.id} className="subtask-item">
                      <label className="subtask-check-label">
                        <input
                          type="checkbox"
                          checked={Boolean(subtask.completed)}
                          onChange={() => toggleSubtaskInForm(subtask.id)}
                        />
                        <span className={subtask.completed ? 'subtask-done' : ''}>{subtask.text}</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-danger subtask-remove-btn"
                        onClick={() => removeSubtaskFromForm(subtask.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Members</label>
                <div className="assignee-actions-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={selectAllAssignees}
                    disabled={!isOwnerUser || assignableMembers.length === 0}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={clearAssignees}
                    disabled={!isOwnerUser || (taskForm.assignedTo || []).length === 0}
                  >
                    Clear
                  </button>
                </div>
                <div className="assignee-select-list">
                  {assignableMembers.length === 0 ? (
                    <p className="assignee-empty">No members available for assignment yet.</p>
                  ) : (
                    assignableMembers.map((member) => (
                      <label key={member.id} className="assignee-select-item">
                        <input
                          type="checkbox"
                          checked={(taskForm.assignedTo || []).includes(Number(member.id))}
                          onChange={() => toggleAssignee(Number(member.id))}
                          disabled={!isOwnerUser}
                        />
                        <span>{member.name} ({member.email})</span>
                      </label>
                    ))
                  )}
                </div>
                {!isOwnerUser && (
                  <p className="assignee-note">Only the project owner can assign members.</p>
                )}
              </div>

              {editingTask && (
                <div className="form-group">
                  <label className="form-label">Attachments</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id={`file-input-${editingTask.id}`}
                      onChange={handleFileUpload}
                      disabled={isUploadingFile}
                      style={{ display: 'none' }}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`file-input-${editingTask.id}`).click();
                      }}
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? 'Uploading...' : '📎 Choose File'}
                    </button>
                    <p className="file-upload-hint">Select a file to upload (Max 25MB)</p>
                  </div>

                  {(() => {
                    const latestTaskInBoard = tasks.find((task) => Number(task.id) === Number(editingTask?.id));
                    const modalAttachments = normalizeAttachments(
                      editingTask?.attachments
                    ).length > 0
                      ? normalizeAttachments(editingTask?.attachments)
                      : normalizeAttachments(latestTaskInBoard?.attachments);

                    if (modalAttachments.length === 0) {
                      return null;
                    }

                    return (
                    <div className="attachments-list">
                      <h4 className="attachments-title">Files ({modalAttachments.length})</h4>
                      {modalAttachments.map((attachment, index) => {
                         // Try to find uploader from memberDetails or use uploaded name
                         const uploader = 
                           memberDetails?.find?.((m) => Number(m.id) === Number(attachment.uploadedBy)) ||
                           { name: attachment.uploadedByName };
                       
                         const uploaderName = uploader?.name || 'Unknown User';
                         const uploadedAtDate = new Date(attachment.uploadedAt).toLocaleString('en-US');
                       
                        return (
                          <div key={index} className="attachment-item">
                            <a
                              href={String(attachment.url || '').startsWith('http') ? attachment.url : `${backendBaseUrl}${attachment.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="attachment-link"
                              title={attachment.filename}
                            >
                              📄 {attachment.filename}
                            </a>
                            <div className="attachment-meta">
                              <span className="attachment-uploader">
                                 Uploaded by {uploaderName}
                              </span>
                              <span className="attachment-date">
                                 {uploadedAtDate}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeTaskModal}>
                  Cancel
                </button>
              </div>

              {editingTask && (
                <div className="comments-section">
                  <h3 className="comments-title">Discussion</h3>
                  <div className="new-comment-row">
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Write a comment"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                    />
                    <button type="button" className="btn btn-primary" onClick={submitRootComment}>
                      Post Comment
                    </button>
                  </div>

                  {isLoadingComments ? (
                    <p className="comment-empty">Loading comments...</p>
                  ) : commentTree.length === 0 ? (
                    <p className="comment-empty">No comments yet. Start the discussion.</p>
                  ) : (
                    <div className="comment-thread">
                      {commentTree.map((comment) => renderCommentNode(comment))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
