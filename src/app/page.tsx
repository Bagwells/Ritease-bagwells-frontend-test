
import { ToastContainer } from "react-toastify";
import HomeScreen from "./home";

export default function Home() {

  return (
    <>
      <ToastContainer position='top-right' closeOnClick />
      <HomeScreen/>
    </>
  );
}
