import React from "react";
import "../styles/tutorialModal.css"; // if using plain CSS

const OptionTutorial = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Hey! Hold up a sec!</h2>
        <>
            <p>
                At this point you may be looking at making your first trade, but before you do I wanted to let you know about a feature of the app that isn't super common sense about trading. 🧠🤯
            </p>
            <p>
                This simulation allows you to perform an option (if you're a pro sports fan, it's similar to a "player option" in the MLB or NBA).
            </p>
            <p>
                The TLDR of an option is a contract that allows one the ability to buy or sell an asset at a specific price, called the "strike price".
            </p>
            <p>
                My simulation uses a very simple version of this with only calls and puts, so if you want to know more about options and/or how I use them in the app, check out the following:
                <a href="https://en.wikipedia.org/wiki/Option_(finance)" target="_blank" rel="noopener noreferrer">Wikipedia</a> &nbsp;
                <a href="https://github.com/TheFaucett/stock-game/tree/main/stock-game/backend" target="_blank" rel="noopener noreferrer">Project Code</a>
            </p>
        </>

        <button onClick={onClose}>Okay, got it!</button>    
      </div>
    </div>
  );
};

export default OptionTutorial;
