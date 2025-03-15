import React from 'react';

const OptimizationPanel = ({ 
  onCalculate, 
  onReset, 
  showingChargingPlan, 
  isLoading = false,
  buttonText = "Calculate Optimal Plan"
}) => {
  return (
    <div className="optimization-panel">
      <div className="button-row">
        {showingChargingPlan ? (
          <button className="reset-button" onClick={onReset}>
            Return to Personal Calendar
          </button>
        ) : (
          <button 
            className="optimize-button" 
            onClick={onCalculate} 
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-text">
                <span className="loading-dot">.</span>
                <span className="loading-dot">.</span>
                <span className="loading-dot">.</span>
                Generating
              </span>
            ) : (
              buttonText
            )}
          </button>
        )}
      </div>
      
      <div className="optimization-info">
        <div className="info-row">
          <span className="info-item">
            <span className="info-icon busy"></span>
            Busy (Can't Charge)
          </span>
        </div>
        <div className="info-row">
          <span className="info-item">
            <span className="info-icon available"></span>
            Low Priority (If Needed)
          </span>
        </div>
        <div className="info-row">
          <span className="info-item">
            <span className="info-icon charging"></span>
            Charging Session
          </span>
        </div>
      </div>
      
      <div className="optimization-note">
        <p>Empty calendar space = Optimal charging time</p>
      </div>
    </div>
  );
};

export default OptimizationPanel;