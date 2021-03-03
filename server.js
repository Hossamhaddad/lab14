'use strict';
const express = require('express');
require('dotenv').config();
const superagent = require('superagent');

const cors = require('cors');

const pg = require('pg');

const overRide=require('method-override')



const PORT = process.env.PORT || 4500;
// const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const server = express();
server.use(cors());
server.use(express.static('./public'));
server.use(express.urlencoded({ extended: true }));
server.use(overRide('putMethod'));
// to tell the express, we want to use ejs template engine
server.set('view engine', 'ejs');
const client = new pg.Client(process.env.DATABASE_URL);

server.get('/', (req, res) => {
  let SQL='SELECT * FROM books;'
  client.query(SQL)
  .then(book=>{

    res.render('pages/index',{selectedBooks:book.rows,NumberofBooks:book.rowCount });
  })
})


/////////////// error handler
// server.use('*',(req,res)=>{
//     res.render('pages/error')
// })

server.get('/search', (req, res) => {
    res.render('pages/searches/new.ejs')
})

server.post('/searches/new', searchHandler);

function searchHandler(req, res) {
    //   let title=req.body.search
    //   let intitle=req.body.intitle
    let url;
    if (req.body.radioType === 'title') {
        url = `https://www.googleapis.com/books/v1/volumes?q=${req.body.search}+intitle:${req.body.search}&projection=full`
    } else if (req.body.radioType === 'author') {
        url = `https://www.googleapis.com/books/v1/volumes?q=${req.body.search}+inauthor:${req.body.search}&projection=full`
    }
    // console.log(url);
    superagent.get(url)
        .then(books => {
            // console.log(books);
            let booksArray = books.body.items.map(book => {
                return new Books(book)
            })
            res.render('pages/searches/show', { books: booksArray });
        })
}
function Books(data) {
    this.title = data.volumeInfo.title ? data.volumeInfo.title : 'no title available'
    // this.authors = data.volumeInfo.authors[0] ? data.volumeInfo.authors[0] : 'not available'
    if(data.volumeInfo.authors!==0){
        this.authors=data.volumeInfo.authors
        console.log(this.authors);
    }if(data.volumeInfo.authors===null){
        this.authors='Not Exist'
    }else{
        this.authors='Not Avaiable' 
    }
    // this.img = data.volumeInfo.imageLinks.smallThumbnail ? data.volumeInfo.imageLinks.smallThumbnail : 'https://i.imgur.com/J5LVHEL.jpg'
    
    if(data.volumeInfo.imageLinks.smallThumbnail===null||data.volumeInfo.imageLinks.smallThumbnail===undefined){
        this.img='https://i.imgur.com/J5LVHEL.jpg'

    }else{
        this.img=data.volumeInfo.imageLinks.smallThumbnail
    }

    this.description = data.volumeInfo.description ? data.volumeInfo.description : 'No avaialbe description'
    //     this.isbn=data.volumeInfo.industryIdentifiers[0].type+data.volumeInfo.industryIdentifiers[0].identifier

  if(data.volumeInfo.industryIdentifiers){
    data.volumeInfo.industryIdentifiers[0].type+data.volumeInfo.industryIdentifiers[0].identifier
}if(data.volumeInfo.authors===null){
    this.isbn='Not Exist'
}else{
    this.isbn='Not Avaiable' 
}


}



client.connect()
.then()
server.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`);
})


server.post('/addbook',bookhandles);

function bookhandles(req,res){
let SQL=`INSERT INTO books (image_url,title,authors,description,isbn) VALUES ($1,$2,$3,$4,$5)RETURNING id;`;
let values=req.body;
let safeVlues=[values.img,values.title,values.authors,values.description,values.isbn];
client.query(SQL,safeVlues)
.then(results=>{
    res.redirect( `/books/${results.rows[0].id}`);
})
}
server.get('/books/:id', booksDetails);

function booksDetails (req,res){
 let value=[req.params.id];
 let SQL=`SELECT * FROM books WHERE id=$1;`;
 client.query(SQL,value)
 .then(result=>{
    res.render('pages/books/show.ejs',{booksDetails:result.rows})
 })
 
}

server.put('/books/:id',booksUpdate);

function booksUpdate(req,res){
   
let {image_url,title,authors,description,isbn}=req.body
let SQL= `UPDATE books SET image_url=$1,title=$2,authors=$3,description=$4,isbn=$5 WHERE id=$6;`;
let values=[image_url,title,authors,description,isbn,req.params.id]
console.log(req.params.id);
client.query(SQL,values)
.then(()=>{
    res.redirect(`/books/${req.params.id}`)
})
}

server.delete('/books/:id',booksDelete);
function booksDelete(req,res){
let SQL=`DELETE FROM books WHERE id=$1;`
let values=[req.params.id]
client.query(SQL,values)
.then(()=>{
    res.redirect('/')
})
}



