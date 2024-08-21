import {
  Canister,
  Err,
  ic,
  nat64,
  Ok,
  Principal,
  query,
  Record,
  Result,
  StableBTreeMap,
  text,
  update,
  Variant,
  Vec,
} from "azle";

// Define Records
const Comment = Record({
  id: Principal,
  by: text,
  comment: text,
  product: text,
  commented_at: nat64,
});

const Product = Record({
  nameofproduct: text,
  owner: text,
  id: Principal,
  description: text,
  comments: Vec(Comment),
  likes: Vec(Principal),
  created_at: nat64,
});

const User = Record({
  username: text,
  id: Principal,
  email: text,
  productsforexhibition: Vec(Product),
  usercontacts: text,
  created_at: nat64,
});

const EnquireAboutAProduct = Record({
  productname: text,
  id: Principal,
  useremail: text,
  enquire: text,
  created_at: nat64,
});

const Question = Record({
  question: text,
  id: Principal,
  useremail: text,
  created_at: nat64,
});

// Define Payloads
const userPayload = Record({
  username: text,
  email: text,
  usercontacts: text,
});

const productPayload = Record({
  nameofproduct: text,
  description: text,
  owner: text,
});

const enquirePayload = Record({
  productname: text,
  useremail: text,
  enquire: text,
});

const commentPayload = Record({
  by: text,
  comment: text,
  productname: text,
});

const questionPayload = Record({
  question: text,
  useremail: text,
});

const likePayload = Record({
  nameofproduct: text,
});

const getUserPayload = Record({
  username: text,
});

const searchProduct = Record({
  productname: text,
});

const getid = Record({
  username: text,
});

// Define Errors
const Errors = Variant({
  notFound: text,
  MissingCredentials: text,
  FailedToBook: text,
  AlreadyRegistered: text,
  NotRegistered: text,
  ProductNotAvailable: text,
  UserNotFound: text,
});

// Storage Maps
const usersStorage = StableBTreeMap<text, typeof User>(0);
const productsStorage = StableBTreeMap<text, typeof Product>(1);
const enquiries = StableBTreeMap<Principal, typeof EnquireAboutAProduct>(2);
const questionStorage = StableBTreeMap<Principal,typeof Question>(3);

// Canister Functions
export default Canister({
  getuser: query([getUserPayload], Result(User, Errors), (payload: any) => {
    const user = usersStorage.get(payload.username);
    if (user === undefined) {
      return Err({
        UserNotFound: `User with username ${payload.username} not found.`,
      });
    }
    return Ok(user);
  }),

  registeruser: update([userPayload], Result(text, Errors), (payload: any) => {
    if (!payload.email || !payload.usercontacts || !payload.username) {
      return Err({
        MissingCredentials: "Some credentials are missing.",
      });
    }

    if (usersStorage.get(payload.username)) {
      return Err({
        AlreadyRegistered: "Username is already registered, try another one.",
      });
    }

    const newUser: typeof User = {
      username: payload.username,
      id: ic.caller(),
      email: payload.email,
      productsforexhibition: [],
      usercontacts: payload.usercontacts,
      created_at: ic.time(),
    };

    usersStorage.insert(payload.username, newUser);
    return Ok("You have successfully registered for this year's exhibition show.");
  }),

  registerproducts_for_exhibition: update(
    [productPayload],
    Result(text, Errors),
    (payload:any) => {
      if (!payload.description || !payload.nameofproduct || !payload.owner) {
        return Err({
          MissingCredentials: "Some credentials are missing.",
        });
      }

      const owner = usersStorage.get(payload.owner);
      if (!owner) {
        return Err({
          NotRegistered: "Only registered users can showcase their products.",
        });
      }

      const newProduct:typeof Product = {
        nameofproduct: payload.nameofproduct,
        owner: payload.owner,
        id: generateId(),
        description: payload.description,
        comments: [],
        likes: [],
        created_at: ic.time(),
      };

      productsStorage.insert(payload.nameofproduct, newProduct);
      owner.productsforexhibition.push(newProduct);
      usersStorage.insert(payload.owner, owner);

      return Ok("Product added for exhibition successfully.");
    }
  ),

  getallproducts_for_exhibition: query([], Vec(Product), () => {
    return productsStorage.values();
  }),

  searchproduct: query([searchProduct], Result(Product, Errors), (payload: any) => {
    if (!payload.productname) {
      return Err({
        MissingCredentials: "Product name field is empty.",
      });
    }

    const product = productsStorage.get(payload.productname);
    if (!product) {
      return Err({
        ProductNotAvailable: `Product with name ${payload.productname} is not available.`,
      });
    }

    return Ok(product);
  }),

  comment_on_product: update([commentPayload], Result(text, Errors), (payload: any) => {
    if (!payload.by || !payload.comment || !payload.productname) {
      return Err({
        MissingCredentials: "Some credentials are missing.",
      });
    }

    const user = usersStorage.get(payload.by);
    if (!user) {
      return Err({
        NotRegistered: "You must be registered to comment on a product.",
      });
    }

    const product = productsStorage.get(payload.productname);
    if (!product) {
      return Err({
        ProductNotAvailable: `Product with name ${payload.productname} is not available.`,
      });
    }

    const newComment: typeof Comment = {
      id: generateId(),
      by: payload.by,
      comment: payload.comment,
      product: payload.productname,
      commented_at: ic.time(),
    };

    product.comments.push(newComment);
    productsStorage.insert(payload.productname, product);

    return Ok("Comment sent successfully.");
  }),

  likeaproduct: update([likePayload], Result(text, Errors), (payload: any) => {
    if (!payload.nameofproduct) {
      return Err({
        MissingCredentials: "Product name is missing.",
      });
    }

    const product = productsStorage.get(payload.nameofproduct);
    if (!product) {
      return Err({
        ProductNotAvailable: `Product with name ${payload.nameofproduct} is not available.`,
      });
    }

    product.likes.push(ic.caller());
    productsStorage.insert(payload.nameofproduct, product);

    return Ok("Like added successfully.");
  }),

  ask_question: update([questionPayload], Result(text, Errors), (payload: any) => {
    if (!payload.question || !payload.useremail) {
      return Err({
        MissingCredentials: "Some credentials are missing.",
      });
    }

    const newQuestion: typeof Question = {
      question: payload.question,
      id: generateId(),
      useremail: payload.useremail,
      created_at: ic.time(),
    };

    questionStorage.insert(generateId(), newQuestion);

    return Ok("Your question has been received. We will provide feedback as soon as possible.");
  }),

  enquire_about_a_product: update([enquirePayload], Result(text, Errors), (payload: any) => {
    if (!payload.enquire || !payload.productname || !payload.useremail) {
      return Err({
        MissingCredentials: "Some credentials are missing.",
      });
    }

    const product = productsStorage.get(payload.productname);
    if (!product) {
      return Err({
        ProductNotAvailable: `Product with name ${payload.productname} is not available.`,
      });
    }

    const newEnquire: typeof EnquireAboutAProduct = {
      productname: payload.productname,
      id: generateId(),
      useremail: payload.useremail,
      enquire: payload.enquire,
      created_at: ic.time(),
    };

    enquiries.insert(generateId(), newEnquire);

    return Ok("Enquiry submitted successfully.");
  }),

  // New Function: Update User Profile
  update_user_profile: update([userPayload], Result(text, Errors), (payload: any) => {
    const user = usersStorage.get(payload.username);
    if (!user) {
      return Err({
        UserNotFound: `User with username ${payload.username} not found.`,
      });
    }

    const updatedUser: typeof User = {
      ...user,
      email: payload.email,
      usercontacts: payload.usercontacts,
    };

    usersStorage.insert(payload.username, updatedUser);

    return Ok("User profile updated successfully.");
  }),

  // New Function: Delete Product
  delete_product: update([searchProduct], Result(text, Errors), (payload: any) => {
    const product = productsStorage.get(payload.productname);
    if (!product) {
      return Err({
        ProductNotAvailable: `Product with name ${payload.productname} is not available.`,
      });
    }

    const owner = usersStorage.get(product.owner);
    if (!owner) {
      return Err({
        UserNotFound: "Owner not found.",
      });
    }

    owner.productsforexhibition = owner.productsforexhibition.filter(
      (p: any) => p.nameofproduct !== payload.productname
    );

    usersStorage.insert(product.owner, owner);
    productsStorage.remove(payload.productname);

    return Ok("Product deleted successfully.");
  }),
});

// Helper function to generate Principal IDs
function generateId(): Principal {
  const randomBytes = new Array(29)
    .fill(0)
    .map(() => Math.floor(Math.random() * 256));
  return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
