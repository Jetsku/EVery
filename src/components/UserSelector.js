import React from 'react';

const UserSelector = ({ users, selectedUser, onSelectUser }) => {
  return (
    <div className="user-selector">
      {users.map(user => (
        <div 
          key={user.id} 
          className={`user-card ${selectedUser.id === user.id ? 'selected' : ''}`}
          onClick={() => onSelectUser(user)}
        >
          <div className="user-avatar">
            {user.name.charAt(0)}
          </div>
          <div className="user-info">
            <h3>{user.name}</h3>
            <p>{user.car}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserSelector;