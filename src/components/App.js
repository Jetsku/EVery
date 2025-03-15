import React, { useState, useEffect } from 'react';
import '../styles/App.css';
import Smartphone from './Smartphone';
import UserSelector from './UserSelector';
import OptimizationPanel from './OptimizationPanel';
import { generateRandomEvents, generateOptimalChargingPlan } from '../utils/calendarUtils';

const users = [
  { id: 1, name: "Kalle Rovanperä", car: "Toyota bZ4X" },
  { id: 2, name: "Michael Jordan", car: "Porsche Taycan" },
  { id: 3, name: "Caitlin Clark", car: "Mercedes EQS" },
  { id: 4, name: "Serena Williams", car: "Aston Martin Rapide E" }
];

const App = () => {
  const [selectedUser, setSelectedUser] = useState(users[0]);
  const [events, setEvents] = useState({});
  const [companyEvents, setCompanyEvents] = useState([]); 
  const [chargingPlan, setChargingPlan] = useState(null);
  const [showChargingPlan, setShowChargingPlan] = useState(false);
  const [utilization, setUtilization] = useState({
    totalChargingHours: 0,
    percentUtilization: 0,
    slotsPerUser: {},
    chargingSessions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate events and optimal charging plan on load
  useEffect(() => {
    // No company events
    setCompanyEvents([]);
    
    // Generate initial events for all users
    const initialEvents = {};
    users.forEach(user => {
      initialEvents[user.id] = generateRandomEvents(user.id, 15);
    });
    setEvents(initialEvents);
    
    // After events are generated, calculate the charging plan in the background
    const plan = generateOptimalChargingPlan(users, initialEvents);
    setChargingPlan(plan);
    
    // Calculate utilization metrics
    const totalHours = calculateChargingHours(plan);
    // Business hours: 9 hours per day for 5 days = 45 hours
    // But there's only one charger, so maximum possible is 45 hours
    const totalPossibleHours = 5 * 9; 
    const percentUtilization = Math.min(Math.round((totalHours / totalPossibleHours) * 100), 100);
    
    // Calculate slots per user
    const slotsPerUser = {};
    users.forEach(user => {
      // Only count actual charging events, not conflicts
      const userEvents = plan.filter(event => 
        event.extendedProps.userId === user.id && 
        event.extendedProps.type === 'charging'
      );
      slotsPerUser[user.id] = userEvents.length;
    });
    
    // Count charging sessions (changes between users)
    let chargingSessions = 0;
    const usersByDay = {};
    
    // Group events by day
    plan.forEach(event => {
      // Skip conflict events
      if (event.extendedProps.type !== 'charging') return;
      
      const day = new Date(event.start).getDay() - 1; // 0 = Monday
      if (day >= 0 && day < 5) {
        usersByDay[day] = usersByDay[day] || [];
        usersByDay[day].push({
          userId: event.extendedProps.userId,
          start: new Date(event.start).getTime()
        });
      }
    });
    
    // Sort events by start time for each day and count changes
    for (const day in usersByDay) {
      usersByDay[day].sort((a, b) => a.start - b.start);
      
      for (let i = 1; i < usersByDay[day].length; i++) {
        if (usersByDay[day][i].userId !== usersByDay[day][i-1].userId) {
          chargingSessions++;
        }
      }
      // Count the first session of each day
      if (usersByDay[day].length > 0) {
        chargingSessions++;
      }
    }
    
    setUtilization({
      totalChargingHours: totalHours,
      percentUtilization,
      slotsPerUser,
      chargingSessions
    });
    
    setIsLoading(false);
  }, []);

  // Now this function only shows/hides the charging plan
  const toggleChargingPlan = () => {
    setShowChargingPlan(true);
  };
  
  const calculateChargingHours = (plan) => {
    let totalMinutes = 0;
    
    plan.forEach(event => {
      // Only include actual charging events, not conflict notifications
      if (event.extendedProps.type === 'charging') {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const durationMinutes = (end - start) / (1000 * 60);
        totalMinutes += durationMinutes;
      }
    });
    
    return totalMinutes / 60;
  };
  
  const resetView = () => {
    setShowChargingPlan(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>EVery</h1>
        <p className="tagline">Every charger utilized</p>
      </header>
      
      <div className="content">
        <div className="smartphone-container">
          <Smartphone 
            user={selectedUser} 
            events={events[selectedUser?.id] || []} 
            companyEvents={companyEvents}
            chargingPlan={showChargingPlan ? chargingPlan : null}
            showChargingPlan={showChargingPlan}
          />
        </div>
        
        <div className="control-panel">
          <div className="panel-section">
            <h2>User Selection</h2>
            <UserSelector 
              users={users} 
              selectedUser={selectedUser} 
              onSelectUser={setSelectedUser} 
            />
          </div>
          
          <div className="panel-section">
            <h2>Optimization</h2>
            <OptimizationPanel 
              onCalculate={toggleChargingPlan}
              onReset={resetView}
              showingChargingPlan={showChargingPlan}
              isLoading={isLoading}
              buttonText={isLoading ? "Generating Schedule..." : "Show Charging Plan"}
            />
          </div>
          
          {showChargingPlan && (
            <div className="panel-section results">
              <h2>Charging Plan Results</h2>
              <div className="result-summary">
                <p>✓ Optimal charging schedule created</p>
                <p>✓ {Math.round(utilization.totalChargingHours)} hours of charging time scheduled</p>
                <p>✓ {utilization.percentUtilization}% charger utilization during business hours</p>
                <p>✓ Only {utilization.chargingSessions} charger switches needed</p>
                <div className="charging-stats">
                  {users.map(user => (
                    <div key={user.id} className="user-charging-stat">
                      <span className="user-name">{user.name}:</span>
                      <span className="charging-count">{utilization.slotsPerUser[user.id]} charging sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;