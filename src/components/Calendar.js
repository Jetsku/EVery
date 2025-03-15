import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar = ({ events, companyEvents, chargingPlan, showChargingPlan }) => {
  // Combine all events based on the view
  const allEvents = showChargingPlan 
    ? [...companyEvents, ...chargingPlan] 
    : [...companyEvents, ...events];

  // Allow event clicking/interaction on the calendar
  const handleEventClick = (eventInfo) => {
    const eventType = eventInfo.event.extendedProps.type;
    
    // Only prevent default action for company events and conflicts
    if (eventType === 'company' || eventType === 'charging-conflict') {
      eventInfo.jsEvent.preventDefault();
    }
  };

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,timeGridDay'
        }}
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        allDaySlot={false}
        events={allEvents}
        eventContent={(eventInfo) => {
          const eventType = eventInfo.event.extendedProps.type;
          
          if (eventType === 'charging') {
            return (
              <div className="charging-event-content">
                <div className="charging-title">{eventInfo.event.title}</div>
                <div className="charging-details">
                  {eventInfo.event.extendedProps.chargingInfo}
                </div>
              </div>
            );
          } else if (eventType === 'charging-conflict') {
            return (
              <div className="charging-conflict-content">
                <div className="charging-title">{eventInfo.event.title}</div>
                <div className="charging-conflict-details">
                  {eventInfo.event.extendedProps.chargingInfo}
                </div>
              </div>
            );
          }
          
          return (
            <div>
              <div>{eventInfo.event.title}</div>
              {eventInfo.timeText && (
                <div className="event-time">{eventInfo.timeText}</div>
              )}
            </div>
          );
        }}
        eventClassNames={(eventInfo) => {
          const type = eventInfo.event.extendedProps.type;
          return [`event-${type}`];
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
        height="100%"
        editable={!showChargingPlan}
        selectable={!showChargingPlan}
        eventClick={handleEventClick}
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
          startTime: '08:00',
          endTime: '18:00'
        }}
        nowIndicator={true}
      />
      
      {!showChargingPlan && (
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color busy"></div>
            <div className="legend-text">Busy (Can't Charge)</div>
          </div>
          <div className="legend-item">
            <div className="legend-color available"></div>
            <div className="legend-text">Empty Space = Available for Charging</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;