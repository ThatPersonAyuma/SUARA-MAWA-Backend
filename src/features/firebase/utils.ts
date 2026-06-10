import {messaging} from './firebase';

type NotifMessage = {
    notification: {
        title: string,
        bodi: string
    },
    data: {
    click_action: string,
        id: string,
        status: string
    },
    token: string
}