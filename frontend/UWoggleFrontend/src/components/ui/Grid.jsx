export default function Grid() {
    const grid = [["A", "B", "C", "D"], ["E", "F", "G", "H"], ["I", "J", "K", "L"], ["M", "N", "O", "P"]];

    return (
        <div className="grid-background">
            <table>
                <tbody>
                    <tr>
                        <td>
                            <div className="circle">{grid[0][0]}</div>
                        </td>
                        <td>
                            <div className="circle">{grid[0][1]}</div>
                        </td>
                        <td>
                            <div className="circle">{grid[0][2]}</div>
                        </td>
                        <td>
                            <div className="circle">{grid[0][3]}</div>
                            </td>
                    </tr>
                    <tr>
                        <td>
                            <div className="circle">{grid[1][0]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[1][1]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[1][2]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[1][3]}</div>
                            </td>
                    </tr>
                    <tr>
                        <td>
                            <div className="circle">{grid[2][0]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[2][1]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[2][2]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[2][3]}</div>
                            </td>
                    </tr>
                    <tr>
                        <td>
                            <div className="circle">{grid[3][0]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[3][1]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[3][2]}</div>
                            </td>
                        <td>
                            <div className="circle">{grid[3][3]}</div>
                            </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}