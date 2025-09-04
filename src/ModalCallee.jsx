
const ModalCallee = ({onAccept, onReject, callData }) => {
    const { callId, callerId, callerName } = callData

    return (
        <div>
            Call from {callerName}
            <button
                onClick={onAccept}
            >
                Accept
            </button>
            <button
                onClick={onReject}
            >
                Reject
            </button>
        </div>
    )
}
export default ModalCallee;