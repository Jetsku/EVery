import { addDays, addHours, startOfWeek, setHours, setMinutes } from 'date-fns';

// Constants
const CHARGER_POWER = 11;
const MIN_CHARGING_DURATION_SLOTS = 6; // 1.5 hours (6 × 15-min slots)
const EMERGENCY_MIN_DURATION = 4; // 1 hour (4 × 15-min slots)

// Generate random events for a user
export const generateRandomEvents = (userId, count, isCompany = false) => {
  const events = [];
  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  if (isCompany) return [];
  
  // Event types and titles
  const eventTypes = ['busy', 'available'];
  const eventTitles = {
    busy: ['Meeting', 'Client Call', 'Focus Time', 'One-on-One'],
    available: ['Lunch Break', 'Flexible Time', 'Office Hours']
  };

  const occupiedTimeSlots = [];
  
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(Math.random() * 5); // Monday to Friday
    let hourOffset = Math.floor(Math.random() * 8) + 8; // 8 AM to 4 PM
    let attempts = 0, validTimeFound = false;
    
    while (!validTimeFound && attempts < 10) {
      hourOffset = Math.floor(Math.random() * 8) + 8;
      const startDate = addHours(addDays(today, dayOffset), hourOffset);
      const duration = Math.floor(Math.random() * 2) + 1; // 1-2 hours
      const endDate = addHours(startDate, duration);
      
      const conflict = occupiedTimeSlots.some(slot => 
        slot.day === dayOffset && 
        ((startDate >= slot.start && startDate < slot.end) ||
        (endDate > slot.start && endDate <= slot.end) ||
        (startDate <= slot.start && endDate >= slot.end))
      );
      
      if (!conflict) {
        validTimeFound = true;
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const titles = eventTitles[type];
        const title = titles[Math.floor(Math.random() * titles.length)];
        
        events.push({
          id: `event-${userId}-${i}`,
          title,
          start: startDate,
          end: endDate,
          extendedProps: {
            type,
            userId,
            lowPriority: type === 'available'
          }
        });
        
        occupiedTimeSlots.push({ day: dayOffset, start: startDate, end: endDate });
      }
      attempts++;
    }
  }
  
  return events;
};

// Generate optimal charging plan based on user schedules
export const generateOptimalChargingPlan = (users, events) => {
  const chargingEvents = [];
  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  // Define standard battery capacities for EV models
  const batteryCapacities = {
    "Toyota bZ4X": 100, "Porsche Taycan": 93.4, 
    "Mercedes EQS": 107.8, "Aston Martin Rapide E": 65
  };

  const businessHourStart = 8, businessHourEnd = 17;
  
  // Track battery percentage for each user for each day
  const batteryState = {};
  users.forEach(user => {
    batteryState[user.id] = {};
    for (let day = 0; day < 5; day++) {
      batteryState[user.id][day] = Math.floor(Math.random() * 30) + 20; // 20-50%
    }
  });
  
  // Process each day of the work week
  for (let day = 0; day < 5; day++) {
    const dayDate = addDays(today, day);
    
    // Create a timeline of 15-minute slots for this day
    const slots = [];
    for (let hour = businessHourStart; hour < businessHourEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        slots.push({
          time: setMinutes(setHours(dayDate, hour), minute),
          assigned: false,
          unavailableFor: [],
          lowPriorityFor: [] // For green events (available but not preferred)
        });
      }
    }
    
    // Mark slots as unavailable or low priority based on events
    users.forEach(user => {
      const userEvents = events[user.id] || [];
      
      userEvents.forEach(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const eventDay = eventStart.getDay() - 1; // 0 = Monday
        
        if (eventDay === day) {
          slots.forEach((slot, index) => {
            const slotTime = slot.time;
            const slotEndTime = new Date(slotTime);
            slotEndTime.setMinutes(slotTime.getMinutes() + 15);
            
            const overlaps = (slotTime >= eventStart && slotTime < eventEnd) ||
                           (slotEndTime > eventStart && slotEndTime <= eventEnd) ||
                           (slotTime <= eventStart && slotEndTime >= eventEnd);
                           
            if (overlaps) {
              if (event.extendedProps.type === 'busy') {
                slots[index].unavailableFor.push(user.id);
              } else if (event.extendedProps.type === 'available') {
                slots[index].lowPriorityFor.push(user.id);
              }
            }
          });
        }
      });
    });
    
    // Find availability windows for each user
    const userAvailability = {};
    users.forEach(user => {
      userAvailability[user.id] = {
        highPriority: [], // Completely free time
        lowPriority: []   // Available but not preferred (green events)
      };
      
      // Find high priority windows (completely free time)
      let startSlot = -1;
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i].unavailableFor.includes(user.id) && 
            !slots[i].lowPriorityFor.includes(user.id)) {
          if (startSlot === -1) startSlot = i;
        } else if (startSlot !== -1) {
          const windowLength = i - startSlot;
          if (windowLength >= MIN_CHARGING_DURATION_SLOTS) {
            userAvailability[user.id].highPriority.push({
              start: startSlot,
              end: i - 1,
              length: windowLength
            });
          }
          startSlot = -1;
        }
      }
      
      // Check for window at the end of the day
      if (startSlot !== -1) {
        const windowLength = slots.length - startSlot;
        if (windowLength >= MIN_CHARGING_DURATION_SLOTS) {
          userAvailability[user.id].highPriority.push({
            start: startSlot,
            end: slots.length - 1,
            length: windowLength
          });
        }
      }
      
      // Find low priority windows (available but not preferred)
      startSlot = -1;
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i].unavailableFor.includes(user.id)) { // Include both free and low priority
          if (startSlot === -1) startSlot = i;
        } else if (startSlot !== -1) {
          const windowLength = i - startSlot;
          if (windowLength >= MIN_CHARGING_DURATION_SLOTS) {
            // Check if this window overlaps with any high priority windows
            const isUnique = !userAvailability[user.id].highPriority.some(
              hp => (startSlot <= hp.end && i > hp.start)
            );
            
            if (isUnique) {
              userAvailability[user.id].lowPriority.push({
                start: startSlot,
                end: i - 1,
                length: windowLength
              });
            }
          }
          startSlot = -1;
        }
      }
      
      // Check low priority window at end of day
      if (startSlot !== -1) {
        const windowLength = slots.length - startSlot;
        if (windowLength >= MIN_CHARGING_DURATION_SLOTS) {
          // Check if this window overlaps with any high priority windows
          const isUnique = !userAvailability[user.id].highPriority.some(
            hp => (startSlot <= hp.end && slots.length > hp.start)
          );
          
          if (isUnique) {
            userAvailability[user.id].lowPriority.push({
              start: startSlot,
              end: slots.length - 1,
              length: windowLength
            });
          }
        }
      }
    });
    
    // Calculate charging need based on battery level
    const chargingNeeds = users.map(user => {
      const batteryLevel = batteryState[user.id][day];
      const batteryCapacity = batteryCapacities[user.car] || 80;
      const maxChargeNeeded = Math.min(100 - batteryLevel, 50); // Max 50% charge
      const energyNeeded = (batteryCapacity * maxChargeNeeded) / 100;
      const hoursNeeded = energyNeeded / CHARGER_POWER;
      
      return {
        userId: user.id,
        user,
        batteryLevel,
        hoursNeeded,
        slotsNeeded: Math.max(MIN_CHARGING_DURATION_SLOTS, Math.min(Math.ceil(hoursNeeded * 4), 16)),
        assigned: false
      };
    }).sort(() => Math.random() - 0.5); // Shuffle to avoid predetermined order
    
    // First pass: Try high priority slots (completely free time)
    chargingNeeds.forEach(need => {
      if (need.assigned) return;
      
      const userId = need.userId;
      const user = need.user;
      const availableWindows = userAvailability[userId]?.highPriority.sort((a, b) => b.length - a.length) || [];
      
      for (const window of availableWindows) {
        const slotsToAssign = Math.min(need.slotsNeeded, window.length);
        
        if (slotsToAssign >= MIN_CHARGING_DURATION_SLOTS) {
          let allFree = true;
          for (let i = window.start; i < window.start + slotsToAssign; i++) {
            if (slots[i].assigned) {
              allFree = false;
              break;
            }
          }
          
          if (allFree) {
            // Assign slots
            for (let i = window.start; i < window.start + slotsToAssign; i++) {
              slots[i].assigned = true;
              slots[i].assignedTo = userId;
            }
            
            createChargingEvent(user, slots[window.start].time, slotsToAssign, 
                               chargingEvents, day, batteryCapacities, 
                               false, false, batteryState);
            need.assigned = true;
            break;
          }
        }
      }
    });
    
    // Second pass: Try low priority slots (available but not preferred)
    chargingNeeds.filter(need => !need.assigned).forEach(need => {
      const userId = need.userId;
      const user = need.user;
      const availableWindows = userAvailability[userId]?.lowPriority.sort((a, b) => b.length - a.length) || [];
      
      for (const window of availableWindows) {
        const slotsToAssign = Math.min(need.slotsNeeded, window.length);
        
        if (slotsToAssign >= MIN_CHARGING_DURATION_SLOTS) {
          let allFree = true;
          for (let i = window.start; i < window.start + slotsToAssign; i++) {
            if (slots[i].assigned) {
              allFree = false;
              break;
            }
          }
          
          if (allFree) {
            // Assign slots
            for (let i = window.start; i < window.start + slotsToAssign; i++) {
              slots[i].assigned = true;
              slots[i].assignedTo = userId;
            }
            
            createChargingEvent(user, slots[window.start].time, slotsToAssign, 
                               chargingEvents, day, batteryCapacities, 
                               false, true, batteryState); // Mark as lower priority
            need.assigned = true;
            break;
          }
        }
      }
    });
    
    // Emergency pass: Find any available slot even with minimum duration
    chargingNeeds.filter(need => !need.assigned).forEach(need => {
      const userId = need.userId;
      const user = need.user;
      
      // Try with emergency minimum duration
      for (let i = 0; i < slots.length - EMERGENCY_MIN_DURATION; i++) {
        let allAvailable = true;
        for (let j = 0; j < EMERGENCY_MIN_DURATION; j++) {
          if (slots[i + j].assigned || slots[i + j].unavailableFor.includes(userId)) {
            allAvailable = false;
            break;
          }
        }
        
        if (allAvailable) {
          // Assign slots
          for (let j = 0; j < EMERGENCY_MIN_DURATION; j++) {
            slots[i + j].assigned = true;
            slots[i + j].assignedTo = userId;
          }
          
          createChargingEvent(user, slots[i].time, EMERGENCY_MIN_DURATION, 
                            chargingEvents, day, batteryCapacities, 
                            true, false, batteryState);
          need.assigned = true;
          break;
        }
      }
      
      // If still not assigned, create conflict notification
      if (!need.assigned) {
        console.warn(`Could not assign charging time for ${user.name} on day ${day}`);
        chargingEvents.push({
          id: `charging-conflict-${userId}-${day}`,
          title: `${user.name} - NO SLOT AVAILABLE`,
          start: setHours(dayDate, 12),
          end: setHours(dayDate, 13),
          extendedProps: {
            type: 'charging-conflict',
            userId: userId,
            chargingInfo: 'No available charging time',
            carModel: user.car,
            isConflict: true
          }
        });
      }
    });
    
    // Final pass: Fill remaining gaps efficiently
    let unassignedSlots = [];
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i].assigned) unassignedSlots.push(i);
    }
    
    while (unassignedSlots.length >= MIN_CHARGING_DURATION_SLOTS) {
      // Find consecutive blocks
      let blocks = [];
      let currentBlock = [unassignedSlots[0]];
      
      for (let i = 1; i < unassignedSlots.length; i++) {
        if (unassignedSlots[i] === unassignedSlots[i-1] + 1) {
          currentBlock.push(unassignedSlots[i]);
        } else {
          if (currentBlock.length >= MIN_CHARGING_DURATION_SLOTS) {
            blocks.push([...currentBlock]);
          }
          currentBlock = [unassignedSlots[i]];
        }
      }
      
      if (currentBlock.length >= MIN_CHARGING_DURATION_SLOTS) {
        blocks.push([...currentBlock]);
      }
      
      if (blocks.length === 0) break;
      
      // Find users for each block
      let assigned = false;
      
      for (const block of blocks) {
        // Find available users
        const availableUsers = users.filter(user => {
          for (const slotIndex of block) {
            if (slots[slotIndex].unavailableFor.includes(user.id)) {
              return false;
            }
          }
          return true;
        });
        
        if (availableUsers.length > 0) {
          // Sort by battery level
          const sortedUsers = [...availableUsers].sort((a, b) => {
            const batteryA = batteryState[a.id]?.[day] || 50;
            const batteryB = batteryState[b.id]?.[day] || 50;
            return batteryA - batteryB; // Lower battery gets priority
          });
          
          const selectedUser = sortedUsers[0];
          
          // Check if this can be merged with adjacent sessions
          let shouldCreateNew = true;
          
          // Mark the block as assigned
          for (const slotIndex of block) {
            slots[slotIndex].assigned = true;
            slots[slotIndex].assignedTo = selectedUser.id;
          }
          
          if (shouldCreateNew) {
            createChargingEvent(selectedUser, slots[block[0]].time, block.length, 
                               chargingEvents, day, batteryCapacities, false, true, batteryState);
          }
          
          assigned = true;
          break;
        }
      }
      
      if (!assigned) break;
      
      // Update unassigned slots
      unassignedSlots = slots.reduce((acc, slot, index) => {
        if (!slot.assigned) acc.push(index);
        return acc;
      }, []);
    }
  }
  
  return chargingEvents;
};

// Helper to create a charging event
function createChargingEvent(user, startTime, durationInSlots, chargingEvents, day, batteryCapacities, isEmergency = false, isLowPriority = false, batteryState = {}) {
  const endTime = new Date(startTime);
  endTime.setMinutes(startTime.getMinutes() + (durationInSlots * 15));
  
  const batteryCapacity = batteryCapacities[user.car] || 80;
  const initialCharge = batteryState[user.id]?.[day] || Math.floor(Math.random() * 30) + 20;
  const chargingTimeHours = durationInSlots / 4;
  const energyAdded = Math.round(CHARGER_POWER * chargingTimeHours);
  const percentAdded = Math.round((energyAdded / batteryCapacity) * 100);
  const endCharge = Math.min(initialCharge + percentAdded, 100);
  
  if (batteryState[user.id]) batteryState[user.id][day] = endCharge;
  
  const suffix = isEmergency ? '-emergency' : (isLowPriority ? '-low' : '');
  
  chargingEvents.push({
    id: `charging-${user.id}-${day}${suffix}-${Date.now()}`,
    title: `${user.name}`,
    start: startTime,
    end: endTime,
    extendedProps: {
      type: 'charging',
      userId: user.id,
      chargingInfo: `${energyAdded}kWh • ${initialCharge}% → ${endCharge}% • 11kW`,
      carModel: user.car,
      isEmergency,
      isLowPriority,
      duringPreference: isLowPriority ? 'low' : 'high'
    }
  });
}