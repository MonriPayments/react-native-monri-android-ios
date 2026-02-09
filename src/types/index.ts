export type ScandocAuthResponse = Record<string, unknown>;

export type ScandocAuthRequest = {
  user_key: string;
  sub_client?: string;
};

export type CreditCardExtractionRequest = {
  DataFields: {
    Image: string;
    ImageType: 'base64';
    ImageCropped: boolean;
  };
  Settings: {
    ShouldReturnDocumentImage: boolean;
    SkipDocumentSizeCheck: boolean;
    SkipImageSizeCheck: boolean;
    CanStoreImages: boolean;
    DontUseValidation: boolean;
  };
  AcceptTermsAndConditions: boolean;
};

export type ExtractionDataField<T = string> = {
  Read: boolean;
  Value: T;
};

export type ExtractionResponse = {
  TransactionID: string;
  UploadedAt: string;
  ProductName: string;
  Errors: string[];
  Warnings: string[];
  Status: number;
  Method: string;
  InfoCode: number;
  Data: {
    CardNumber?: ExtractionDataField;
    ExpiryDate?: ExtractionDataField;
    [key: string]: ExtractionDataField | undefined;
  };
  ImageData?: {
    CreditCardImage?: string;
  };
  AnalysisTime: string;
};

export type ValidationRequest = {
  AcceptTermsAndConditions: boolean;
  Settings: {
    SkipImageSizeCheck: boolean;
  };
  DataFields?: {
    Images: string[];
    ImageType: 'base64';
    ImageCropped: boolean;
  };
};

export type ValidationResponse = {
  TransactionID: string;
  UploadedAt: string;
  ProductName: string;
  Errors: string[];
  Warnings: string[];
  Status: number;
  Method: 'Validation';
  InfoCode: number;
  Keypoints?: [number, number][];
  DetectedBlurValue?: number;
  Validated: boolean;
  Index?: number;
  AnalysisTime: string;
};
