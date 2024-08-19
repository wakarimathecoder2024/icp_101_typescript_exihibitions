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
//establish sneakers shop
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
const retriveCommenstPayload = Record({
  productname: text,
});
const likePayload=Record({
  nameofproduct:text,
});
//types
type Product = typeof Product.tsType;
type User = typeof User.tsType;
type EnquireAboutAProduct = typeof EnquireAboutAProduct.tsType;
type Comment = typeof Comment.tsType;
type Question = typeof Question.tsType;

//payloads
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
const getid = Record({
  username: text,
});
const searchProduct = Record({
  productname: text,
});
const commentPaylod = Record({
  by: text,
  comment: text,
  productname: text,
});
const questionPayload = Record({
  question: text,
  useremail: text,
});
const getUserPayload=Record({
  username:text,
}
)
//errors
const Errors = Variant({
  notFound: text,
  MissingCredentails: text,
  FaildToBook: text,
  AlreadyRegistered: text,
  NotRegistered: text,
  ProductNotAvailable: text,
  UserNotFound:text,
});

//storages
const usersStorages = StableBTreeMap<text, User>(0);
const productsStorages = StableBTreeMap<text, Product>(1);
const enquiries = StableBTreeMap<Principal, EnquireAboutAProduct>(2);
const questionstorages = StableBTreeMap<Principal, Question>(3);

export default Canister({
  getuser: query([getUserPayload] , Result(User,Errors), (payload) => {
    const getuser=usersStorages.get(payload.username).Some;
    if(!getuser){
      return Err({
        UserNotFound:`user with ${payload.username} not found`
      })
    }
    return Ok(getuser);
   
  }),
  registeruser: update([userPayload], Result(text, Errors), (payload) => {
    //check that all credentials are available
    if (!payload.email || !payload.usercontacts || !payload.username) {
      return Err({
        MissingCredentails: "some credentials are missing",
      });
    }
    //verify that email is of correct format
    // if(!payload.email.con("@")){
    //     return Err()
    // }
    //check if username is already taken
    const username_exists = usersStorages.get(payload.username).Some;
    if (username_exists) {
      return Err({
        AlreadyRegistered:
          "username provided is already registered try another one",
      });
    }
    //register user
    const new_user: User = {
      username: payload.username,
      id: ic.caller(),
      email: payload.email,
      productsforexhibition: [],
      usercontacts: payload.usercontacts,
      created_at: ic.time(),
    };
    usersStorages.insert(payload.username, new_user);
    return Ok("you have successfully registered for this year exhibition show");
  }),

  //register products for showcase
  registerproducts_for_exhibition: update(
    [productPayload],
    Result(text, Errors),
    (payload) => {
      //verify that all fields are present
      if (!payload.description || !payload.nameofproduct || !payload.owner) {
        return Err({
          MissingCredentails: "some credentials are missing",
        });
      }
      //check if user is already registered
      const owner_exists = usersStorages.get(payload.owner).Some;
      if (!owner_exists) {
        return Err({
          NotRegistered:
            "only registered users are allowed to showcase their products for exhibition",
        });
      }
      //register product for exhibition
      const new_product: Product = {
        nameofproduct: payload.nameofproduct,
        owner: payload.owner,
        id: generateId(),
        description: payload.description,
        comments: [],
        likes: [],
        created_at: ic.time(),
      };
      //upadte products and users storages
      productsStorages.insert(payload.nameofproduct, new_product);
      //update on users side
      const upadated_user: User = {
        ...owner_exists,
        productsforexhibition: [...owner_exists.productsforexhibition,new_product],
      };
      usersStorages.insert(payload.owner, upadated_user);
      return Ok("you have added product for exhibition successfully");
    }
  ),
  //function to get all products that will be available for exhibitions
  getallproducts_for_exhibition: query([], Vec(Product), () => {
    return productsStorages.values();
  }),

  //search for a product to know if it will be available for exhibitions
  searchproduct: query([searchProduct], Result(Product, Errors), (payload) => {
    //verify that the field for search is not empty
    if (!payload.productname) {
      return Err({
        MissingCredentails: "product name field is empty",
      });
    }
    const get_product = productsStorages.get(payload.productname).Some;
    if (!get_product) {
      return Err({
        ProductNotAvailable: `product with ${payload.productname} is not available`,
      });
    }
    return Ok(get_product);
  }),
  //comment on a product
  comment_on_product: update(
    [commentPaylod],
    Result(text, Errors),
    (payload) => {
      //verify that every field is not empty
      if (!payload.by || !payload.comment || !payload.productname) {
        return Err({
          MissingCredentails: "some credentials are missing",
        });
      }
      //verify that is comment is already registered
      const user_registered = usersStorages.get(payload.by).Some;
      if (!user_registered) {
        return Err({
          NotRegistered:
            "you must be registered inorder to comment on a product",
        });
      }
      //verify that the product actually exists
      const get_product = productsStorages.get(payload.productname).Some;
      if (!get_product) {
        return Err({
          ProductNotAvailable: `product by name ${payload.productname} is not available`,
        });
      }
      //add new comment
      const new_comment: Comment = {
        id: generateId(),
        by: payload.by,
        comment: payload.comment,
        product: payload.productname,
        commented_at: ic.time(),
      };
      //update user storages and product storages
      const upadted_products: Product = {
        ...get_product,
        comments: [...get_product.comments, new_comment],
      };
      //update on users side
      const get_owner = usersStorages.get(get_product.owner).Some;
      if (!get_owner) {
        return Err({
          notFound: "failed to comment on product",
        });
      }
      productsStorages.insert(get_product.owner, upadted_products);

      const upadated_user: User = {
        ...get_owner,
        productsforexhibition: [...get_owner.productsforexhibition,upadted_products],
      };
      usersStorages.insert(get_product.owner,upadated_user);
      return Ok("comment sent successfully");
    }
  ),
  

  //function to add like to a product
  likeaproduct:update([likePayload],Result(text,Errors),(payload)=>{
    //verify that payload is not empty
    if(!payload.nameofproduct){
      return(
        Err({
          MissingCredentails: "name o product is missing",
        })
      )
    }

    //verify if product exists
    const get_product = productsStorages.get(payload.nameofproduct).Some;
    if (!get_product) {
      return Err({
        ProductNotAvailable: `product by name ${payload.nameofproduct} is not available`,
      });
    }
    //add like
    const upadted_products: Product = {
      ...get_product,
      likes: [...get_product.likes, ic.caller()],
    };
    //update on users side
    const get_owner = usersStorages.get(get_product.owner).Some;
    if (!get_owner) {
      return Err({
        notFound: "failed to like a product",
      });
    }
    productsStorages.insert(get_product.owner, upadted_products);

    const upadated_user: User = {
      ...get_owner,
      productsforexhibition: [
        ...get_owner.productsforexhibition,
        upadted_products,
      ],
    };
    usersStorages.insert(get_product.owner,upadated_user);
    return Ok("like added")
  }),
  //ask a question concerning exhibitions
  ask_question: update([questionPayload], Result(text, Errors), (payload) => {
    //verify that all fields are available
    if (!payload.question || !payload.useremail) {
      return Err({
        MissingCredentails: "some credentials are missing",
      });
    }
    //ask question
    const new_question: Question = {
      question: payload.question,
      id: generateId(),
      useremail: payload.useremail,
      created_at: ic.time(),
    };
    questionstorages.insert(generateId(), new_question);
    return Ok(
      "your concern have been received we will provide a feedback as soon as possible"
    );
  }),
  //enquire about a product
  enquire_about_a_product: update(
    [enquirePayload],
    Result(text, Errors),
    (payload) => {
      //verify that all fields are available
      if (!payload.enquire || !payload.productname || !payload.useremail) {
        return Err({
          MissingCredentails: "some credentials are missing",
        });
      }
      //ensure that the prodcut user want to enquire is availble
      const get_product = productsStorages.get(payload.productname).Some;
      if (!get_product) {
        return Err({
          ProductNotAvailable: `product ${payload.productname} is not available`,
        });
      }
      //new enquire
      const new_enquire: EnquireAboutAProduct = {
        productname: payload.productname,
        id: generateId(),
        useremail: payload.useremail,
        enquire: payload.enquire,
        created_at: ic.time(),
      };

      enquiries.insert(generateId(), new_enquire);
      return Ok("enquire have been submitted");
    }
  ),
});

//helpers function to generate principals ids
function generateId(): Principal {
  const randomBytes = new Array(29)
    .fill(0)
    .map((_) => Math.floor(Math.random() * 256));
  return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
