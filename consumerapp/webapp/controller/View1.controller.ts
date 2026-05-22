import Controller from "sap/ui/core/mvc/Controller";
import MyDialogHanlder, { MyDialogHandler$SubmitEvent } from "com/myorg/reuselib/controller/MyDialogHandler";
import MessageToast from "sap/m/MessageToast";
import Log from "sap/base/Log";

/**
 * @namespace miyasuta.consumerapp.controller
 */
export default class View1 extends Controller {

    public onInit(): void {
        Log.info("View1 controller initialized");
    }

    public onOpenDialog(): void {
        const dialogHandler = new MyDialogHanlder();
        dialogHandler.attachSubmit((event: MyDialogHandler$SubmitEvent) => {
            const message = event.getParameter("message");
            MessageToast.show(`Dialog submitted with message: ${message}`);
        });
        dialogHandler.open();
    }
}