// userController.js
exports.syncUserBalance = async (req, res) => {
    const { userId } = req.params;

    try {
        const portfolio = await Portfolio.findOne({ userId });
        if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

        const user = await User.findByIdAndUpdate(
            userId,
            { balance: portfolio.balance },
            { new: true }
        );

        res.json({ message: "User balance synced", user });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: "Server error" });
    }
};
