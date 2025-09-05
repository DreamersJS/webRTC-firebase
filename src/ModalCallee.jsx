export default function ModalCallee({ callData, onAccept, onReject }) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <p className="text-lg font-semibold">
            Incoming call from {callData.callerName}
          </p>
          <div className="flex gap-4">
            <button
              className="px-4 py-2 bg-green-500 text-white rounded"
              onClick={onAccept}
            >
              Accept
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={onReject}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }
  