export default function ModalCallerCalling({ callee, onCancel }) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <p className="text-lg font-semibold">Calling {callee}...</p>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={onCancel}
          >
            Cancel Call
          </button>
        </div>
      </div>
    );
  }
  