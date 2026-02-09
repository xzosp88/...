import React, { useState } from 'react';

const Calculator = () => {
  const [displayValue, setDisplayValue] = useState('0');
  const [firstOperand, setFirstOperand] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  const performCalculation = (op, first, second) => {
    switch (op) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '*':
        return first * second;
      case '/':
        // Handle division by zero
        if (second === 0) return 'Error';
        return first / second;
      default:
        return second;
    }
  };

  const handleInputDigit = (digit) => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      // Prevent multiple leading zeros
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const handleInputDecimal = () => {
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const handleOperator = (nextOperator) => {
    const inputValue = parseFloat(displayValue);

    if (firstOperand === null && !isNaN(inputValue)) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = performCalculation(operator, firstOperand, inputValue);

      if (result === 'Error') {
        setDisplayValue('Error');
        setFirstOperand(null);
        setOperator(null);
        return;
      }

      // Ensure the result is formatted cleanly
      setDisplayValue(String(result).slice(0, 10)); // Limit display length
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator === '=' ? null : nextOperator);
  };

  const handleClear = () => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const Button = ({ label, className = '', onClick, type = 'number' }) => {
    let baseStyles = 'p-4 rounded-lg text-2xl font-semibold transition-all duration-150 active:opacity-80';
    
    if (type === 'operator') {
      baseStyles += ' bg-orange-500 hover:bg-orange-600 text-white';
    } else if (type === 'control') {
      baseStyles += ' bg-gray-300 hover:bg-gray-400 text-black';
    } else { // number
      baseStyles += ' bg-gray-700 hover:bg-gray-600 text-white';
    }

    if (label === '0') {
      baseStyles += ' col-span-2';
    }

    return (
      <button 
        className={`${baseStyles} ${className}`} 
        onClick={() => onClick(label)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-xs p-4 bg-gray-800 rounded-2xl shadow-2xl">
        {/* Display */}
        <div className="mb-4">
          <div 
            className="text-right text-white text-5xl p-4 min-h-[80px] overflow-hidden whitespace-nowrap bg-black rounded-xl"
            style={{direction: 'ltr'}}
          >
            {displayValue}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-3">
          
          {/* Row 1: Controls */}
          <Button label="C" type="control" onClick={handleClear} />
          <Button label="±" type="control" onClick={() => setDisplayValue(String(parseFloat(displayValue) * -1))} />
          <Button label="%" type="control" onClick={() => setDisplayValue(String(parseFloat(displayValue) / 100))} />
          <Button label="/" type="operator" onClick={handleOperator} />

          {/* Row 2: 7, 8, 9, * */}
          <Button label="7" onClick={handleInputDigit} />
          <Button label="8" onClick={handleInputDigit} />
          <Button label="9" onClick={handleInputDigit} />
          <Button label="*" type="operator" onClick={handleOperator} />

          {/* Row 3: 4, 5, 6, - */}
          <Button label="4" onClick={handleInputDigit} />
          <Button label="5" onClick={handleInputDigit} />
          <Button label="6" onClick={handleInputDigit} />
          <Button label="-" type="operator" onClick={handleOperator} />

          {/* Row 4: 1, 2, 3, + */}
          <Button label="1" onClick={handleInputDigit} />
          <Button label="2" onClick={handleInputDigit} />
          <Button label="3" onClick={handleInputDigit} />
          <Button label="+" type="operator" onClick={handleOperator} />

          {/* Row 5: 0, ., = */}
          <Button label="0" onClick={handleInputDigit} /> 
          <Button label="." onClick={handleInputDecimal} className="col-span-1" />
          <Button label="=" type="operator" onClick={handleOperator} className="col-span-1" />
        </div>
      </div>
    </div>
  );
};

export default Calculator;