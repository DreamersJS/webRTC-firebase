import { useEffect, useState } from "react";
import { getAllUsers } from "./login/users.service";

const ListUsers = ({ onCall, selectedUser }) => {
    const [users, setUsers] = useState([])

    useEffect(() => {
        handleListUsers()
    }, [])

    const handleListUsers = async () => {
        const u = await getAllUsers()
        setUsers(u)
    }

    return (
        <div>
            {users.map((u) => (
                <div key={u.id}>
                    <span>{u.username}</span>
                    <button
                        onClick={() => onCall({id: u.id, username: u.username})}
                        disabled={selectedUser?.id === u.id}
                    >
                        {selectedUser?.id === u.id ? "Calling..." : "Call"}
                    </button>
                </div>
            ))}
        </div>
    )
}
export default ListUsers;