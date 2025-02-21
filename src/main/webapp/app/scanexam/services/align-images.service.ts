/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable prefer-const */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { Subject, Observable } from 'rxjs';
import { worker } from './workerimport';
import { Student, IStudent } from '../../entities/student/student.model';

export interface IImageAlignement {
  imageCompareMatches?: ImageData;
  keypoints1?: ImageData;
  keypoints2?: ImageData;
  imageAligned?: ImageData;
  imageCompareMatchesWidth?: number;
  imageCompareMatchesHeight?: number;
  keypoints1Width?: number;
  keypoints1Height?: number;
  keypoints2Width?: number;
  keypoints2Height?: number;
  imageAlignedWidth?: number;
  imageAlignedHeight?: number;
}

export interface IImageAlignementInput {
  imageA?: ImageData;
  imageB?: ImageData;
  marker?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
export interface IImageCropInput {
  image?: ImageData;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface IImagePredictionInput {
  image?: ImageData;
  match?: string[];
}
export interface IImagePredictionOutput {
  solution?: (string | number)[];
  debug: ImageData;
}

export interface IImageCropOutput {
  image?: ImageData;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AlignImagesService {
  worker!: Worker;
  ready!: Promise<void>;
  subjects = new Map<string, Subject<any>>();
  constructor() {
    if (typeof Worker !== 'undefined') {
      // Create a new
      this.worker = worker;
      this.worker.onmessage = ({ data }) => {
        if (this.subjects.has(data.uid)) {
          // console.log( ' receive message '  + data.uid)

          this.subjects.get(data.uid)?.next(data.payload);
          this.subjects.get(data.uid)?.complete();
        }
        //   console.log(`service got message1: ${JSON.stringify(data.msg)}`);
      };
      this.worker.onerror = e => {
        if (this.subjects.has((e as any).uid)) {
          console.log('get error uid');
          this.subjects.get((e as any).uid)?.error(e);
        }
        console.log(`error on service work: ${JSON.stringify(e)}`);
      };
      this.worker.postMessage({ msg: 'load', uid: '0' });
      const p = new Subject();
      this.subjects.set('0', p);

      this.ready = new Promise((res, rej) => {
        this.subjects
          .get('0')
          ?.asObservable()
          .subscribe(
            () => {
              res();
            },
            () => rej()
          );
      });
    } else {
      // Web workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  /**
   * We will use this method privately to communicate with the worker and
   * return a promise with the result of the event. This way we can call
   * the worker asynchronously.
   */
  private _dispatch<T>(msg1: any, pay: any): Observable<T> {
    const uuid1 = uuid(); // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
    this.ready.then(() => {
      // console.log( ' send message ' + msg1 + ' ' + uuid1)
      this.worker.postMessage({ msg: msg1, uid: uuid1, payload: pay });
    });
    const p = new Subject<T>();
    this.subjects.set(uuid1, p);
    this.ready = new Promise((res, rej) => {
      this.subjects
        .get(uuid1)
        ?.asObservable()
        .subscribe(
          () => {
            res();
          },
          () => rej()
        );
    });
    return p.asObservable();
  }
  public imageProcessing(image: ImageData): Observable<ImageData> {
    return this._dispatch('imageProcessing', image);
  }

  public imageAlignement(payload: IImageAlignementInput): Observable<IImageAlignement> {
    return this._dispatch('imageAlignement', payload);
  }

  public imageCrop(payload: IImageCropInput): Observable<ImageData> {
    return this._dispatch('imageCrop', payload);
  }
  public prediction(payload: IImagePredictionInput, letter: boolean): Observable<IImagePredictionOutput> {
    if (letter) {
      return this._dispatch('nameprediction', payload);
    } else {
      return this._dispatch('ineprediction', payload);
    }
  }
}
