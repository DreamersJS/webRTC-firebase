
const ModalCallerCalling = ({ callee, onCancel }) => {
    return (
        <div>
        <div>
            <h2>Calling {callee}...</h2>
            <button onClick={onCancel}>Cancel Call</button>
        </div>
        </div>
    );
}
export default ModalCallerCalling;