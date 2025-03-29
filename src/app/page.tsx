
import { ToastContainer } from "react-toastify";
import HomeScreen from "./home";

export default function Home() {

  return (
    <div>
      <ToastContainer position='top-right' closeOnClick />
      <HomeScreen/>
    </div>
  );
}
