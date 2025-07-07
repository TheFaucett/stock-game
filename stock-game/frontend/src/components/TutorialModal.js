import React from "react";
import "../styles/TutorialModal.css"; // if using plain CSS

const TutorialModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Welcome to Flint Market!</h2>
        <p>
          Welcome to my app, a stock trading simulation meant to show how trading markets function. 💸
          This app is a HUUUGE work in progress🛠️,  so check back often to see what else I've added (or broken).
          Here is a basic rundown of how to play/use/test this app: 
        
        </p>
        <ul>
          <li>📊 Buy and sell stocks to grow your portfolio. This is done via going to a stock-specific page and purchasing some shares (with the cash I allot you to start, $10,000)</li>
          <li>💼 I would recommend starting by clicking into the map under this text to look at some of the most popular stocks.</li>
          <li>Obviously, to make money you need to buy low 📉 and sell high 📈, so buy your stocks in a dip and sell them when they are up.</li>
          <li>IRL, traders use news to predict market moves, so we do the same here! That information is available by hitting that little drop down up and to the right!</li>
          <li>To the left, you'll find a similar arrow which allows you to access your sidebar, which contains some basic info about your portfolio, but a full workup of what you have is available by hitting that fancy green button to the right.</li>
          <li>🔎 There is a ton to this app and I am constantly adding changes and features (shorting, firms, mood trends, banks, and all sorts of other craziness), so feel free to explore!</li>
          <li>📝 If you have anything to let me know about (or you found something that's broken), check out this github repo with the full code: https://github.com/TheFaucett/stock-game</li>
          <li>🎉 Enjoy the game!  -TheFaucett, 2025.07.05</li>
        </ul>
        <button onClick={onClose}>Okay, got it!</button>
      </div>
    </div>
  );
};

export default TutorialModal;
