import React from 'react';
import Calendar from './Calendar';

const Smartphone = ({ user, events, companyEvents, chargingPlan, showChargingPlan }) => {
  return (
    <div className="smartphone">
      <div className="smartphone-header">
        <div className="smartphone-notch"></div>
      </div>
      <div className="smartphone-screen">
        <div className="app-header-mobile">
          {showChargingPlan ? (
            <>
              <h2>EV Charging Schedule</h2>
              <p className="user-info">Company-wide view</p>
            </>
          ) : (
            <>
              <h2>My Calendar</h2>
              <p className="user-info">{user.name} • {user.car}</p>
            </>
          )}
        </div>
        
        <Calendar 
          events={events} 
          companyEvents={companyEvents} 
          chargingPlan={chargingPlan}
          showChargingPlan={showChargingPlan}
        />
      </div>
      <div className="smartphone-footer">
        <div className="smartphone-home-button"></div>
      </div>
    </div>
  );
};

export default Smartphone;