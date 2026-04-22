function handleFlowEngine(user, userMessage) {
    // Basic structured responses depending on active flow
    const flow = user.active_flow;

    if (flow === 'medication_reminder') {
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes('yes') || lowerMsg.includes('took it')) {
            return { nextMessage: "Great! Glad you are keeping on track.", clearFlow: true };
        } else if (lowerMsg.includes('no') || lowerMsg.includes('forgot')) {
            return { nextMessage: "No worries, please try to take it as soon as you remember. Let me know if you experience any issues.", clearFlow: true };
        }
        return { nextMessage: "I'm checking if you've taken your medication today. Please reply Yes or No.", clearFlow: false };
    }

    if (flow === 'weekly_checkin') {
        return { nextMessage: "Thanks for checking in! Your health graph has been updated.", clearFlow: true };
    }

    return null;
}

module.exports = { handleFlowEngine };
